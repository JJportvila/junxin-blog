# Junxin's Blog

个人博客源码，基于 [Jekyll](https://jekyllrb.com/) 与 [Chirpy](https://github.com/cotes2020/jekyll-theme-chirpy) 主题，托管在 Cloudflare Pages。

## 本地预览

需要 Ruby 3.1+（本机已装在 `C:\Ruby34-x64`）。

```bash
# 首次
bundle install

# 启动本地服务（默认 http://127.0.0.1:4000）
bundle exec jekyll serve --livereload
```

Windows 下如果提示找不到 `bundle`，先把 Ruby 加入当前终端 PATH：

```powershell
$env:Path = "C:\Ruby34-x64\bin;$env:Path"
```

## 写一篇新文章

在 `_posts/` 下新建文件，命名格式为 `YYYY-MM-DD-标题.md`，开头写 front matter：

```yaml
---
title: 文章标题
date: 2026-11-17 20:00:00 +0800
categories: [随笔]
tags: [标签一, 标签二]
lang: zh-CN          # 英文文章写 en
---

正文用 Markdown 写。
```

保存后 `git push`，Cloudflare Pages 会自动构建并上线。

## 目录结构

| 路径 | 用途 |
| --- | --- |
| `_config.yml` | 站点配置（名称、作者、链接、评论等） |
| `_posts/` | 所有文章 |
| `_tabs/` | 左侧导航页面（关于、归档、分类、标签） |
| `_data/` | 侧边栏联系方式、分享平台 |
| `assets/` | 图片等静态资源（`assets/lib` 是主题资源子模块，不要手动改） |
| `_plugins/` | 构建用的自定义插件 |

## 发布图片

小图片直接放进 `assets/img/` 并在文章里引用；大量图片建议放 Cloudflare R2，再把公开域名填到 `_config.yml` 的 `cdn:` 字段，这样文章里的 `/xxx.jpg` 会自动走 R2。

## 部署（Cloudflare Pages）

在 Cloudflare 控制台 → Workers & Pages → 创建 Pages → 连接 Git 仓库，构建参数：

| 配置项 | 值 |
| --- | --- |
| 生产分支 | `main` |
| 构建命令 | `git submodule update --init --recursive && bundle install && bundle exec jekyll build` |
| 输出目录 | `_site` |
| 环境变量 | `RUBY_VERSION=3.4.4`、`JEKYLL_ENV=production` |

首次构建完成后会得到一个 `*.pages.dev` 域名，之后每次推送 `main` 都会自动重新部署。

## 许可

文章内容版权归作者所有；主题与模板代码遵循 MIT 协议。
