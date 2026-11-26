import Foundation
import WebKit

enum SketchBridgeEvent: Sendable {
    case ready
    case change(scene: String)
    case copyRequested
    case copyJSONRequested
    case saveRequested
    case newRequested
    case boardSwitchRequested(id: String, scene: String)
    case boardCreateRequested(scene: String)
    case boardRenameRequested(id: String, title: String)
    case boardDeleteRequested(id: String, scene: String)
}

@MainActor
protocol SketchBridgeDelegate: AnyObject {
    func sketchBridge(_ bridge: SketchBridge, didReceive event: SketchBridgeEvent)
}

@MainActor
final class SketchBridge: NSObject, WKScriptMessageHandler {
    static let name = "deckSketch"

    weak var delegate: (any SketchBridgeDelegate)?

    nonisolated func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard let body = message.body as? [String: Any],
              let type = body["type"] as? String else {
            return
        }

        debugLog("[sketch] bridge event: \(type)")
        let event: SketchBridgeEvent?
        switch type {
        case "ready":
            event = .ready
        case "change":
            if let scene = body["scene"] as? String {
                event = .change(scene: scene)
            } else {
                event = nil
            }
        case "copyRequested":
            event = .copyRequested
        case "jsonCopyRequested":
            event = .copyJSONRequested
        case "saveRequested":
            event = .saveRequested
        case "newRequested":
            event = .newRequested
        case "boardSwitchRequested":
            if let id = body["id"] as? String {
                event = .boardSwitchRequested(id: id, scene: body["scene"] as? String ?? "")
            } else {
                event = nil
            }
        case "boardCreateRequested":
            event = .boardCreateRequested(scene: body["scene"] as? String ?? "")
        case "boardRenameRequested":
            if let id = body["id"] as? String, let title = body["title"] as? String {
                event = .boardRenameRequested(id: id, title: title)
            } else {
                event = nil
            }
        case "boardDeleteRequested":
            if let id = body["id"] as? String {
                event = .boardDeleteRequested(id: id, scene: body["scene"] as? String ?? "")
            } else {
                event = nil
            }
        default:
            event = nil
        }
        guard let event else {
            debugLog("[sketch] bridge event ignored: \(type)")
            return
        }

        Task { @MainActor [weak self] in
            guard let self else { return }
            self.delegate?.sketchBridge(self, didReceive: event)
        }
    }
}
