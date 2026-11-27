import Foundation

/// stdout 逐行 JSON 输出。
///
/// 用 `fputs` + `fflush` 而不是 `print`：父进程（Electron）按行读管道，
/// 标准库的缓冲会让数据滞留在缓冲区里，表现为"笔动了但屏幕半天不动"。
enum Emit {
    static func line(_ object: [String: Any]) {
        guard
            let data = try? JSONSerialization.data(withJSONObject: object, options: [.sortedKeys]),
            let text = String(data: data, encoding: .utf8)
        else {
            return
        }
        fputs(text + "\n", stdout)
        fflush(stdout)
    }

    static func err(_ message: String) {
        fputs(message + "\n", stderr)
        fflush(stderr)
    }

    /// 坐标与压力都保留 4 位小数，够用且不会让 JSON 太长。
    static func pen(
        nx: Double,
        ny: Double,
        pressure: Double,
        rawPressure: Int,
        tiltX: Int,
        tiltY: Int,
        phase: String,
        barrel1: Bool,
        barrel2: Bool,
        eraser: Bool
    ) {
        line([
            "t": "pen",
            "x": (nx * 10000).rounded() / 10000,
            "y": (ny * 10000).rounded() / 10000,
            "p": (pressure * 10000).rounded() / 10000,
            "px": rawPressure,
            "tx": tiltX,
            "ty": tiltY,
            "ph": phase,
            "b1": barrel1,
            "b2": barrel2,
            "er": eraser
        ])
    }
}
