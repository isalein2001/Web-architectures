import Capacitor
import UIKit

class BridgeViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        configureWebViewScrolling()
    }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginType(HealthKitPlugin.self)
    }

    private func configureWebViewScrolling() {
        guard let scrollView = webView?.scrollView else { return }

        scrollView.bounces = false
        scrollView.alwaysBounceVertical = false
        scrollView.alwaysBounceHorizontal = false
        scrollView.contentInsetAdjustmentBehavior = .never
    }
}
