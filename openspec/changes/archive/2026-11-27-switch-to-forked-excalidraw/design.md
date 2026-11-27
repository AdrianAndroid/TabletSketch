# design · switch-to-forked-excalidraw

## 1. 基线

- 官方 tag：`v0.18.1` → commit `a2ec2889babf7d2295469c6d90ebe77fae57df84`
- TabletSketch 的 `package.json` 锁 `@excalidraw/excalidraw@0.18.1`，与基线一致。
- submodule 指针保持 `a2ec288`，本变更不升级、不降级。

## 2. fork 形态

```
origin    git@github.com:AdrianAndroid/excalidraw.git    （可写）
upstream  https://github.com/excalidraw/excalidraw.git    （只读，用于同步官方）
```

- fork 上补推了 tag `v0.18.1`，因为 GitHub fork 默认不带官方 tag。
- 专用分支 `tablet-sketch/0.18.1` 从 `a2ec288` 拉出，作为所有 `TS-FORK` 改动的唯一基线。
- 同步上游：`git fetch upstream --tags` 后按需 cherry-pick 到专用分支；不直接跟官方 main。

## 3. URL 策略

`.gitmodules` 记录 **https** URL，保证没有 SSH key 的环境也能 clone；本地 submodule 的 `origin` 用 **ssh**，方便推送。

两者不一致是刻意的。代价：执行 `git submodule sync` 会把本地 `origin` 覆盖成 https，推送前需要临时改回 ssh，或改用带凭据的 https。

## 4. 构建路径不变

本变更**不**把依赖切到 submodule 源码：

- `Web/sketch` 仍从 npm 包 `@excalidraw/excalidraw@0.18.1` 解析。
- 只有出现第一个必须改 Excalidraw 源码的需求时，才另开变更把依赖切到 `Web/vendor/excalidraw`，并按 `Docs/fork-changes.md` 的 `TS-FORK` 规则改源码、登记、导出 patch。

## 5. 验证

```bash
git submodule status                        # a2ec288 (v0.18.1)
git -C Web/vendor/excalidraw remote -v      # origin=fork, upstream=官方
git -C Web/vendor/excalidraw branch -a      # tablet-sketch/0.18.1
git -C Web/vendor/excalidraw ls-remote origin refs/heads/tablet-sketch/0.18.1 refs/tags/v0.18.1
```

## 6. 回退

把 `.gitmodules` 的 url 改回官方仓库，`git submodule sync --recursive`，submodule 指针不变，构建不受影响。
