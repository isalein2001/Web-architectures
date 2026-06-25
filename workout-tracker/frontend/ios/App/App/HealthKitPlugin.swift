import Capacitor
import Foundation
import HealthKit

@objc(HealthKitPlugin)
public class HealthKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthKitPlugin"
    public let jsName = "HealthKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getTodayActivity", returnType: CAPPluginReturnPromise)
    ]

    private let healthStore = HKHealthStore()

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve([
            "available": HKHealthStore.isHealthDataAvailable()
        ])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit is not available on this device.")
            return
        }

        healthStore.requestAuthorization(toShare: [], read: healthReadTypes()) { success, error in
            if let error = error {
                call.reject(error.localizedDescription)
                return
            }

            call.resolve([
                "granted": success
            ])
        }
    }

    @objc func getTodayActivity(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit is not available on this device.")
            return
        }

        let startOfDay = Calendar.current.startOfDay(for: Date())
        let endDate = Date()
        let group = DispatchGroup()
        var steps = 0.0
        var activeEnergyKcal = 0.0
        var exerciseMinutes = 0.0
        var workoutCount = 0
        var firstError: Error?

        group.enter()
        queryQuantitySum(identifier: .stepCount, unit: .count(), startDate: startOfDay, endDate: endDate) { value, error in
            steps = value
            firstError = firstError ?? error
            group.leave()
        }

        group.enter()
        queryQuantitySum(identifier: .activeEnergyBurned, unit: .kilocalorie(), startDate: startOfDay, endDate: endDate) { value, error in
            activeEnergyKcal = value
            firstError = firstError ?? error
            group.leave()
        }

        if HKObjectType.quantityType(forIdentifier: .appleExerciseTime) != nil {
            group.enter()
            queryQuantitySum(identifier: .appleExerciseTime, unit: .minute(), startDate: startOfDay, endDate: endDate) { value, error in
                exerciseMinutes = value
                firstError = firstError ?? error
                group.leave()
            }
        }

        group.enter()
        queryWorkoutCount(startDate: startOfDay, endDate: endDate) { count, error in
            workoutCount = count
            firstError = firstError ?? error
            group.leave()
        }

        group.notify(queue: .main) {
            if let firstError = firstError {
                call.reject(firstError.localizedDescription)
                return
            }

            call.resolve([
                "steps": Int(steps.rounded()),
                "activeEnergyKcal": Int(activeEnergyKcal.rounded()),
                "exerciseMinutes": Int(exerciseMinutes.rounded()),
                "workoutCount": workoutCount,
                "lastSyncAt": ISO8601DateFormatter().string(from: Date())
            ])
        }
    }

    private func healthReadTypes() -> Set<HKObjectType> {
        var types = Set<HKObjectType>()

        if let stepCount = HKObjectType.quantityType(forIdentifier: .stepCount) {
            types.insert(stepCount)
        }

        if let activeEnergy = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) {
            types.insert(activeEnergy)
        }

        if let exerciseTime = HKObjectType.quantityType(forIdentifier: .appleExerciseTime) {
            types.insert(exerciseTime)
        }

        types.insert(HKObjectType.workoutType())
        return types
    }

    private func queryQuantitySum(
        identifier: HKQuantityTypeIdentifier,
        unit: HKUnit,
        startDate: Date,
        endDate: Date,
        completion: @escaping (Double, Error?) -> Void
    ) {
        guard let quantityType = HKObjectType.quantityType(forIdentifier: identifier) else {
            completion(0, nil)
            return
        }

        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        let query = HKStatisticsQuery(quantityType: quantityType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, statistics, error in
            let value = statistics?.sumQuantity()?.doubleValue(for: unit) ?? 0
            completion(value, error)
        }

        healthStore.execute(query)
    }

    private func queryWorkoutCount(startDate: Date, endDate: Date, completion: @escaping (Int, Error?) -> Void) {
        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        let query = HKSampleQuery(sampleType: HKObjectType.workoutType(), predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
            completion(samples?.count ?? 0, error)
        }

        healthStore.execute(query)
    }
}
