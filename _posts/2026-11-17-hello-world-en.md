---
title: Hello, World
date: 2026-11-17 09:05:00 +0800
categories: [Notes]
tags: [blog, hello]
lang: en
---

Welcome to **Junxin's Blog**. This is the first post, and a small opening ceremony for the site.

## Why a blog

Writing things down — ideas, mistakes, books I've read — is a way of thinking them through twice. This blog will hold technical notes and some observations on everyday life.

## How this site is built

The whole stack is free and deliberately simple:

| Piece | Tool | Role |
| --- | --- | --- |
| Blog engine | Jekyll + Chirpy theme | Turns Markdown into static HTML |
| Source hosting | GitHub | Version control and build trigger |
| Site hosting | Cloudflare Pages | Global CDN, free for static sites |
| Image storage (optional) | Cloudflare R2 | 10 GB free storage, zero egress fees |

Publishing a post takes three steps: create a Markdown file, `git push`, and wait a few seconds for the deploy.

## A code block

```ruby
puts "Hello, world!"
```

## About languages

The blog is bilingual. Chinese posts live under Chinese categories such as `随笔`; English posts live under `Notes`. Each post declares its language with the `lang` field in its front matter, and the typography adapts accordingly.

More to come. Thanks for stopping by.
