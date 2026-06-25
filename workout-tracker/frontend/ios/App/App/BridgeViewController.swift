import Capacitor
import UIKit

class BridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginType(HealthKitPlugin.self)
    }
}
