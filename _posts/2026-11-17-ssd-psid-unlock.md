---
title: 被"锁死"的 SSD 起死回生：一块三星 PM9C1a 的 PSID 解锁实战
date: 2026-11-17 19:00:00 +0800
categories: [随笔]
tags: [SSD, 数据恢复, TCG Opal, PSID, 硬件维修]
lang: zh-CN
---

> 技术实战 · 案例复盘 · 2026-11 · 数据安全 / 存储维修

一块 256GB 的固态硬盘插到电脑上"毫无反应"：显示 RAW、只读、容量异常，换硬盘盒、换电脑都一样。它一度被判定为**主控损坏、只能报废**。直到一句"这块盘以前设过硬盘锁"改变了方向——它其实**根本没坏，只是被自加密锁住了**。最终通过 PSID Revert 原地复活。本文复盘整个判断链条，并给出一套**纯离线、可复用、少敲命令**的解决工具与方案。

---

## 1. 故障现象：一块"读不出来"的盘

故障起点是一块装在 USB 硬盘盒（RTL9210 桥接芯片）里的 M.2 NVMe 固态硬盘。表现如下：

- 插入电脑后无法正常使用，分区显示为 `RAW`，文件系统无法识别；
- 磁盘属性显示 `IsReadOnly = True`（只读），最大可用区为 0；
- 读取 SMART 信息失败，偶发 `ERROR_IO_DEVICE / 8007045D`；
- 更换另一块 SSD 到同一个硬盘盒则一切正常——一度把嫌疑指向这块盘本身。

这些现象非常容易让人得出"盘坏了"的结论。而事实上，每一条都是**加密锁定状态下的典型伪装**。

---

## 2. 诊断：三次判断，两次被推翻

真正的难点不在于"怎么修"，而在于"到底哪里坏了"。整个诊断经历了三次修正：

1. **判断一：分区/文件系统损坏 → 尝试格式化**（❌ 被推翻）
   按常规思路做清除只读、clean、重建 GPT、格式化。但只读无法解除，格式化失败。

2. **判断二：SSD 主控或闪存颗粒硬件损坏**（❌ 被推翻）
   结合"换盒不正常、换盘正常""换到另一台电脑也读不出来"，一度判定为硬件级故障，建议报废。

3. **判断三（正确）：BIOS 硬盘密码 / TCG Opal 自加密锁**
   关键信息出现——"这块盘以前是有硬盘锁的"。所有异常瞬间合理：这是被 Opal 锁住的自加密盘（SED），固件在锁定状态下拒绝读写与安全命令。

4. **确认身份：读取标签**
   标签确认为三星 PM9C1a 256GB（Dell OEM），并带有 **PSID**（物理安全标识）——这正是解锁的钥匙。

> **经验一**：先问"它以前被锁过吗"。RAW、只读、读不到 SMART、换机依旧——这套组合碰上"曾被设置硬盘密码/Opal 锁"，几乎可以直接锁定方向。硬件损坏的判断，往往输在没问这一句。

---

## 3. 原理：为什么格式化没用，PSID 才行

### 三种"密码"不是一回事

| 类型 | 作用位置 | 能否用清 BIOS / 抠电池解决 |
|------|----------|---------------------------|
| BIOS 开机密码 | 主板固件，只管开机流程 | 可以（清 CMOS 即可） |
| ATA 硬盘密码 | SATA 硬盘控制器 | 不行，密码存在盘内 |
| **TCG Opal 自加密锁** | NVMe SSD 内的加密引擎 | **不行，必须走 Opal 流程** |

这块 Dell OEM 三星盘属于第三类：**SED 自加密盘**。NVMe SSD 不走传统 ATA Security，它的"硬盘密码"本质是 TCG Opal 2.0 的锁定。锁定时，加密密钥被保护起来，数据虽然还在盘上，但读写被固件拒绝，表现为只读、RAW、容量异常。

### PSID Revert：绕过密码的"物理后门"

每块 Opal 自加密盘的标签上都印有一串唯一的 **PSID**（物理安全标识）。它是厂商预设的物理主密钥，可以用来把加密芯片**恢复出厂**：

- 用 PSID 重置 TPG/TPer 到出厂状态，加密密钥被销毁；
- 密钥一旦销毁，全盘数据即成为无法还原的乱码——**这就是它不可逆、会清空全部数据的原因**；
- 盘回到未初始化的出厂状态，重新分区格式化后即可正常使用。

> ⚠️ **不可逆警告**：PSID Revert 会永久销毁加密密钥和全部数据，无法恢复。对任何有数据的盘执行前，务必三思。

---

## 4. 目标盘身份信息

| 项目 | 值 |
|------|-----|
| 型号 | 三星 PM9C1a 256GB（Dell OEM） |
| PN | MZ9L8256HDJD-00BD1 |
| MODEL | MZ-9L8256C |
| DPN | 03497H |
| 固件 FW | 57330309 |
| 规格 | M.2 2230，额定 DC 3.3V |
| PSID | `6YGK••••••••••••D5HX`（已打码） |
| 产地 / 日期 | Made in China · 2024.03 |

---

## 5. 方案：三条路线，按环境选择

核心动作只有一个——执行 PSID Revert。难点在于"在哪个环境里执行"。我们准备了三条路线：

| 路线 | 适用场景 | 入口 | 特点 |
|------|----------|------|------|
| **Windows 正常模式** | 能正常进系统 | `一键重置.bat` | 自动提权，全程日志，最省事 |
| **Windows 安全模式** | 只能进安全模式 | `PE专用_一键重置.bat` | 纯 cmd，不依赖 PowerShell / UAC / Server 服务 |
| **U 盘 Linux Live** | 没有系统盘 / 前两条失败 | Ventoy → Ubuntu → `go.sh` | 完全绕开 Windows 限制，成功率最高 |

三条路线共用同一个工具包（`sedutil-cli` 的 Windows / Linux 版本）和同一份 PSID 配置，目标都是那条不可逆命令：

```
sedutil-cli --yesIreallywanttoERASEALLmydatausingthePSID <PSID> /dev/nvme0
```

本案例最终走的是 **U 盘救援盘路线**：进入 root shell（`#`），`--scan` 扫到 256GB 盘，执行 PSID Revert。首次因 PSID 识别问题返回 `rc = 12`（认证未通过），核对后重试成功。**盘没有因为失败而损坏——这正是 PSID Revert 的特性：失败就是失败，可以反复试。**

---

## 6. 工具下载（官方 / 社区编译版）

本案例用到的工具全部可离线获取。以下链接均已核实为官方或社区维护的发布页，**下载后请核对哈希**。

**sedutil-cli —— 核心解锁工具**（Windows 命令行程序，本案例的 `sedutil-cli.exe` 即来自此 SHA-512 版本）
- GitHub 发布页：https://github.com/ChubbyAnt/sedutil/releases/tag/1.15-5ad84d8
- Windows  exe 直链：https://github.com/ChubbyAnt/sedutil/releases/download/1.15-5ad84d8/sedutil-cli.exe-1.15-5ad84d8.zip
- 源码 / Linux 编译用：https://github.com/ChubbyAnt/sedutil/releases/download/1.15-5ad84d8/sedutil-cli-1.15-5ad84d8.zip

**Linux 版 sedutil（1.15.1 更新版二进制）**（本案例的 `sedutil-cli-linux` 来自此包）
- Releases：https://github.com/ChubbyAnt/sedutil/releases （找 `linux-binaries-1.15.1-44-ge29fbb1.zip`）

**RESCUE64 救援镜像**（自带 sedutil 的 64 位救援系统，`login: root` 无密码，本案例最终路线所用）
- 直链：https://github.com/ChubbyAnt/sedutil/releases/download/1.15-5ad84d8/RESCUE64-1.15-5ad84d8.img.gz （58.6 MB）

**Ventoy —— 多 ISO 启动 U 盘**（把 ISO/IMG 丢进 U 盘即可引导）
- 官网：https://www.ventoy.net/en/download.html
- GitHub：https://github.com/ventoy/Ventoy/releases

**Ubuntu Live Server（Linux 路线用）**
- 官网：https://ubuntu.com/download/server （选 amd64 ISO）

**BalenaEtcher —— 写盘工具**
- 官网：https://etcher.balena.io/

> **下载与校验提示**：GitHub 官方 Drive-Trust-Alliance/sedutil 仓库不提供编译好的 release，Windows 可执行文件来自社区维护的 ChubbyAnt 分支（SHA-512 版本，与旧 SHA-1 版不兼容）。下载后务必核对 MD5/SHA256，例如 `sedutil-cli.exe-1.15-5ad84d8.zip` 的 MD5 为 `f0ec8d020802482768336f38cc0dad32`，`RESCUE64-1.15-5ad84d8.img.gz` 为 `66ca594085d898cbd46698f172d84966`。

---

## 7. 关键踩坑与修复（最有参考价值的部分）

### ① USB 硬盘盒是"拦路虎"
RTL9210 等 USB 桥接芯片**不透传 TCG Opal 命令**。盘只要还装在硬盘盒里，`sedutil` 就扫不到或显示 `No`。必须把 SSD **取出、直连主板 M.2 插槽**。M.2 2230 短盘在台式机上可能还需要 2230→2280 转接片。

### ② 安全模式里 `net session` 是"假警报"
最初脚本用 `net session` 判断管理员权限，导致"弹窗一下就提示按键退出"。根因：**安全模式不启动 Server 服务，`net session` 永远失败**，即使右键"以管理员身份运行"也会误报；UAC 提权依赖的 Appinfo 服务在安全模式下也常不可用。

修复：
- 改用进程令牌判定 `WindowsPrincipal.IsInRole(Administrator)`，不依赖任何服务；
- 安全模式下改用纯 cmd 脚本，不需要 PowerShell / UAC / Server 服务；
- 窗口保持不自动关闭，全程输出写入 `last_run.log`，便于事后定位停在哪一步。

### ③ 批处理"闪退"是编码问题
双击 `.bat` 一闪而过，根因是 **UTF-8 无 BOM + 中文 + LF 换行** 导致 `cmd.exe` 解析错位。修复规范：
- `.bat` 一律**纯 ASCII、无 BOM、CRLF**，不写中文、不 `chcp 65001`；
- `.ps1` / `.txt` 用 UTF-8 BOM + CRLF；
- `.sh` 用 LF、无 BOM，并保持 POSIX 兼容（避免 bash 专有语法）。

### ④ 反复提权与误选内置盘
两个安全陷阱一并修掉：提权加"只尝试一次"防死循环；选盘时不再盲目"唯一候选自动选定"，而是**只有候选约 256GB 或在磁盘列表中不可见（锁定盘的典型特征）才自动选**，否则停下让人确认——因为 PSID Revert 打错目标就是不可逆的灾难。

### ⑤ PSID 别在日志和新闻里泄露
PSID 相当于盘的物理主密钥。工具在界面上只显示前后各 4 位（如 `6YGK ... D5HX`），本文也做了打码。**完整 PSID 只应出现在你自己的标签和配置文件里。**

### ⑥ Linux 挂载别猜设备名
用 `mount LABEL=Ventoy /mnt` 按卷标挂载，而不是猜 `/dev/sda1`——这样即使插着别的硬盘也不会挂错。NVMe 设备用控制器节点 `/dev/nvme0`，不是分区节点 `/dev/nvme0n1`。

---

## 8. 可复用操作流程

1. **确认前提**：SSD 已从 USB 硬盘盒取出，直连主板 M.2；已确认盘内无重要数据。
2. **填 PSID**：把标签上的 PSID（含横线空格均可）粘进 `PSID.txt` 的 `PSID=` 后面保存，只需一次；注意区分 0/O、1/I、2/Z、5/S、8/B。
3. **进环境**：按现场条件选 Windows / 安全模式 / U 盘 Linux 三条路线之一。
4. **扫描确认**：运行 `sedutil-cli --scan`，确认能看到那块 256GB 盘且第二列不是 `No`。
5. **执行解锁**：运行 PSID Revert 命令，最后确认输 `Y`。看到 `revertTper completed successfully` 即成功；出现 `NOT_AUTHORIZED` 说明 PSID 输错，核对后重试即可。
6. **验证**：重启后执行 `sedutil-cli --query /dev/nvme0`，`Locked = N` 即解锁成功。
7. **收尾**：把盘初始化为 GPT + NTFS（Windows 用磁盘管理或脚本，纯 Linux 用 `parted` + `mkfs.ntfs`），装回硬盘盒即可正常使用。

---

## 📌 写在最后：这次复盘的三条经验

1. **现象会骗人，身份信息不会。** RAW、只读、读不到 SMART 既可能是坏盘也可能是锁盘。先看标签、先问历史，再下"报废"结论。
2. **加密盘的问题，要用加密的方式解。** 格式化、清只读、刷固件都解决不了 Opal 锁；PSID Revert 才是正解，而且失败无害、可重试。
3. **工具的价值在"少出错"。** 自动提权、自动选盘、自动读 PSID、日志留痕、防误伤内置盘——把不可逆操作的安全边界做进工具里，比写在说明里更可靠。

---

*本文为技术案例复盘，PSID 等敏感信息已做打码处理 · 涉及不可逆操作，请勿对存有重要数据的磁盘尝试*
