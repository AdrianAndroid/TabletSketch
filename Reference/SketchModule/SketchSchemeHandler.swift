import Foundation
import WebKit

/// 把 Excalidraw 静态资源放在 deck-sketch://local/ 下，避免 file:// 的目录和模块限制。
final class SketchSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "deck-sketch"
    static let host = "local"

    let root: URL

    init(root: URL) {
        self.root = root.standardizedFileURL
    }

    /// 找 `index.html` 所在的目录。
    /// SwiftPM 生成的资源 bundle 是真正的 .bundle：`.bundle/Contents/Resources/Sketch`；
    /// 早期构建也出现过资源直接摊在 `Contents/Resources/Sketch` 的情况，两种都查。
    static func resourceRoot() -> URL? {
        let fm = FileManager.default
        var candidates: [URL] = []

        func appendBundleCandidates(_ container: URL) {
            guard let items = try? fm.contentsOfDirectory(at: container,
                                                          includingPropertiesForKeys: nil) else { return }
            for item in items where item.pathExtension == "bundle" {
                if let bundle = Bundle(url: item),
                   let url = bundle.url(forResource: "Sketch", withExtension: nil) {
                    candidates.append(url)
                }
                candidates.append(item.appendingPathComponent("Contents/Resources/Sketch"))
                candidates.append(item.appendingPathComponent("Sketch"))
            }
            candidates.append(container.appendingPathComponent("Sketch"))
        }

        if let resources = Bundle.main.resourceURL {
            appendBundleCandidates(resources)
        }
        appendBundleCandidates(Bundle.main.bundleURL)

        var seen = Set<String>()
        for url in candidates {
            let path = url.standardizedFileURL.path
            guard seen.insert(path).inserted else { continue }
            if fm.fileExists(atPath: path + "/index.html") {
                return url.standardizedFileURL
            }
        }
        return nil
    }

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else {
            task.didFailWithError(Self.error(404))
            return
        }

        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }
        let relative = String(path.dropFirst()).removingPercentEncoding ?? String(path.dropFirst())
        let target = root.appendingPathComponent(relative).standardizedFileURL

        guard target.path == root.path || target.path.hasPrefix(root.path + "/") else {
            task.didFailWithError(Self.error(403))
            return
        }
        guard let data = try? Data(contentsOf: target) else {
            task.didFailWithError(Self.error(404))
            return
        }

        let mime = Self.mimeType(for: target.pathExtension)
        let response = URLResponse(
            url: url,
            mimeType: mime,
            expectedContentLength: data.count,
            textEncodingName: Self.isText(mime) ? "utf-8" : nil
        )
        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}

    private static func mimeType(for extension: String) -> String {
        switch `extension`.lowercased() {
        case "html", "htm": return "text/html"
        case "js", "mjs": return "text/javascript"
        case "css": return "text/css"
        case "json": return "application/json"
        case "woff2": return "font/woff2"
        case "woff": return "font/woff"
        case "ttf": return "font/ttf"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "svg": return "image/svg+xml"
        case "gif": return "image/gif"
        case "webp": return "image/webp"
        default: return "application/octet-stream"
        }
    }

    private static func isText(_ mime: String) -> Bool {
        mime.hasPrefix("text/") || mime == "application/json"
    }

    private static func error(_ code: Int) -> NSError {
        NSError(
            domain: "SketchSchemeHandler",
            code: code,
            userInfo: [NSLocalizedDescriptionKey: code == 403 ? "禁止访问该路径" : "资源不存在"]
        )
    }
}
