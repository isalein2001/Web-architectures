import Capacitor
import Foundation
import UserNotifications

@objc(HydrationReminderPlugin)
public class HydrationReminderPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HydrationReminderPlugin"
    public let jsName = "HydrationReminder"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "schedule", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPending", returnType: CAPPluginReturnPromise)
    ]

    private let reminderHours = [8, 10, 12, 14, 16, 18, 20, 22]
    private let notificationCenter = UNUserNotificationCenter.current()

    @objc func schedule(_ call: CAPPluginCall) {
        let title = call.getString("title") ?? "HYDRATION REMINDER"
        let message = call.getString("message") ?? "Time to drink water. Keep your daily target on track."

        requestAuthorizationIfNeeded { granted in
            guard granted else {
                call.reject("Notification permission was not granted.")
                return
            }

            self.removeHydrationRequests()

            let group = DispatchGroup()
            var scheduledCount = 0
            var firstError: Error?

            for hour in self.reminderHours {
                var dateComponents = DateComponents()
                dateComponents.hour = hour
                dateComponents.minute = 0

                let content = UNMutableNotificationContent()
                content.title = title
                content.body = message
                content.sound = .default
                content.categoryIdentifier = "HYDRATION_REMINDER"

                let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
                let request = UNNotificationRequest(
                    identifier: self.identifierForHour(hour),
                    content: content,
                    trigger: trigger
                )

                group.enter()
                self.notificationCenter.add(request) { error in
                    if let error = error {
                        firstError = firstError ?? error
                    } else {
                        scheduledCount += 1
                    }
                    group.leave()
                }
            }

            group.notify(queue: .main) {
                if let firstError = firstError {
                    call.reject(firstError.localizedDescription)
                    return
                }

                call.resolve([
                    "scheduled": true,
                    "count": scheduledCount,
                    "hours": self.reminderHours
                ])
            }
        }
    }

    @objc func cancel(_ call: CAPPluginCall) {
        removeHydrationRequests()
        call.resolve([
            "cancelled": true
        ])
    }

    @objc func getPending(_ call: CAPPluginCall) {
        notificationCenter.getPendingNotificationRequests { requests in
            let hydrationRequests = requests.filter { $0.identifier.hasPrefix("nextreps-hydration-") }
            call.resolve([
                "count": hydrationRequests.count,
                "ids": hydrationRequests.map { $0.identifier }
            ])
        }
    }

    private func requestAuthorizationIfNeeded(completion: @escaping (Bool) -> Void) {
        notificationCenter.getNotificationSettings { settings in
            switch settings.authorizationStatus {
            case .authorized, .provisional, .ephemeral:
                completion(true)
            case .notDetermined:
                self.notificationCenter.requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
                    completion(granted)
                }
            case .denied:
                completion(false)
            @unknown default:
                completion(false)
            }
        }
    }

    private func removeHydrationRequests() {
        notificationCenter.removePendingNotificationRequests(withIdentifiers: reminderHours.map(identifierForHour))
    }

    private func identifierForHour(_ hour: Int) -> String {
        "nextreps-hydration-\(hour)"
    }
}
