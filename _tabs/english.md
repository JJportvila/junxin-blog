---
title: English
icon: fas fa-language
order: 4
---

{% assign en_posts = site.posts | where: 'lang', 'en' %}

<div id="post-list" class="flex-grow-1 px-xl-1">
  {% for post in en_posts %}
    <article class="card-wrapper card">
      <a href="{{ post.url | relative_url }}" class="post-preview row g-0">
        <div class="col-md-12">
          <div class="card-body d-flex flex-column">
            <h1 class="card-title my-2 mt-md-0">{{ post.title }}</h1>
            <div class="card-text content mt-0 mb-3">
              <p>{{ post.excerpt | strip_html | strip_newlines | truncate: 180 }}</p>
            </div>
            <div class="post-meta flex-grow-1 d-flex align-items-end">
              <div class="me-auto">
                <i class="far fa-calendar fa-fw me-1"></i>
                <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: '%Y-%m-%d' }}</time>
                {% if post.categories.size > 0 %}
                  <i class="far fa-folder-open fa-fw ms-3 me-1"></i>
                  <span class="categories">{{ post.categories | join: ', ' }}</span>
                {% endif %}
              </div>
            </div>
          </div>
        </div>
      </a>
    </article>
  {% endfor %}
</div>
