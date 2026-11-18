const textFields = ["name", "role", "previous", "education"];
let fullscreenReturnPosition = null;
let fullscreenExitTime = 0;
let navigationProjects = [];
let disposeArtGallery = () => {};
history.scrollRestoration = "manual";

function saveNavigationPosition() {
  history.replaceState({ ...history.state, scrollX: window.scrollX, scrollY: window.scrollY }, "");
}

function showNavigationState() {
  const state = history.state;
  const project = navigationProjects[state?.projectIndex];
  if (state?.view === "project" && project) {
    openProject(project, false);
  } else {
    disposeArtGallery();
    document.querySelectorAll("#detail-content video").forEach(video => video.pause());
    document.querySelector("#detail-view").hidden = true;
    document.querySelector("#gallery").hidden = false;
    document.body.classList.remove("video-expanded");
    document.querySelectorAll(".web-fullscreen").forEach(player => player.classList.remove("web-fullscreen"));
    fullscreenReturnPosition = null;
  }
  window.scrollTo(state?.scrollX || 0, state?.scrollY || 0);
}

window.addEventListener("popstate", showNavigationState);
window.addEventListener("scroll", saveNavigationPosition, { passive: true });

document.querySelector(".sidebar-avatar-home").addEventListener("click", () => {
  history.replaceState({ view: "home", scrollX: 0, scrollY: 0 }, "");
  showNavigationState();
  window.scrollTo(0, 0);
});

function restoreVideoPosition() {
  if (!fullscreenReturnPosition) return;
  const position = fullscreenReturnPosition;
  fullscreenReturnPosition = null;
  window.scrollTo(position.x, position.y);
  requestAnimationFrame(() => window.scrollTo(position.x, position.y));
}

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement) {
    fullscreenExitTime = performance.now();
    restoreVideoPosition();
  }
});

function addLine(parent, value) {
  if (!value) return;
  const line = document.createElement("p");
  line.textContent = value;
  parent.append(line);
}

function renderProfile(profile) {
  const copy = document.querySelector("#profile-copy");
  textFields.forEach((field) => addLine(copy, profile[field]));
  document.querySelector("#location").textContent = profile.location || "";
}

function hasProjectDetail(project) {
  return (Array.isArray(project.detailSections) && project.detailSections.length > 0) || Boolean(project.externalUrl);
}

function renderProjects(projects) {
  const list = document.querySelector("#project-list");
  projects.forEach((project, projectIndex) => {
    if (!hasProjectDetail(project)) return;
    const row = document.createElement("button");
    row.className = "project-row";
    row.type = "button";
    row.addEventListener("click", () => openProject(project));
    row.dataset.projectIndex = projectIndex;

    const title = document.createElement("span");
    title.className = "project-title";
    title.textContent = project.sidebarTitle ?? project.title ?? "未命名项目";

    const year = document.createElement("span");
    year.textContent = project.year || "";

    row.append(title, year);
    list.append(row);
    const syncTile = () => {
      const tile = document.querySelector(`.tile[data-project-index="${projectIndex}"]`);
      row.classList.add("is-active");
      if (!tile || document.querySelector("#gallery").hidden) return;
      tile.classList.add("is-active");
      const bounds = tile.getBoundingClientRect();
      if (bounds.top < 0 || bounds.bottom > window.innerHeight) {
        tile.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
      }
    };
    const clearTile = () => {
      if (row.matches(":hover, :focus-visible")) return;
      row.classList.remove("is-active");
      document.querySelector(`.tile[data-project-index="${projectIndex}"]`)?.classList.remove("is-active");
    };
    row.addEventListener("mouseenter", syncTile);
    row.addEventListener("focus", syncTile);
    row.addEventListener("mouseleave", clearTile);
    row.addEventListener("blur", clearTile);
  });
}

function renderGallery(projects) {
  const gallery = document.querySelector("#gallery");
  const items = projects.filter(hasProjectDetail);

  items.forEach((project) => {
    const projectIndex = projects.indexOf(project);
    const tile = document.createElement("button");
    tile.className = "tile";
    tile.dataset.projectIndex = projectIndex;
    const name = document.createElement("span");
    name.className = "tile-project-name";
    name.textContent = project.title || "未命名项目";
    name.setAttribute("aria-hidden", "true");
    if (project.coverStyle === "website-card") {
      tile.classList.add("tile--website-card");
      const cover = document.createElement("img");
      cover.className = "website-card-cover";
      cover.src = project.image;
      cover.alt = "";
      tile.append(cover);
    } else if (project.coverStyle === "centered-cover") {
      tile.classList.add("tile--centered-cover");
      const cover = document.createElement("img");
      cover.className = "centered-tile-cover";
      cover.src = project.image;
      cover.alt = "";
      tile.append(cover);
    }
    tile.type = "button";
    tile.setAttribute("aria-label", `打开${project.title || "未命名项目"}详情`);
    tile.addEventListener("click", () => openProject(project));
    if (project.image && !["website-card", "centered-cover"].includes(project.coverStyle)) {
      tile.style.backgroundImage = `url(${JSON.stringify(project.image)})`;
      tile.style.backgroundSize = "cover";
      tile.style.backgroundPosition = "center";
    }
    const previewVideo = project.detailSections?.find(section => section.type === "video");
    if (previewVideo && project.coverStyle !== "website-card") {
      const video = document.createElement("video");
      video.className = "tile-preview-video";
      video.src = previewVideo.src;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.setAttribute("aria-hidden", "true");
      tile.append(video);
      const frame = document.createElement("img");
      frame.className = "tile-preview-frame";
      frame.src = "assets/project01-02/票根边框 7.png";
      frame.alt = "";
      frame.setAttribute("aria-hidden", "true");
      tile.append(frame);
      video.play().catch(() => {});
    }
    tile.append(name);
    const sidebarRow = document.querySelector(`.project-row[data-project-index="${projectIndex}"]`);
    const setActive = active => sidebarRow?.classList.toggle("is-active", active);
    tile.addEventListener("mouseenter", () => setActive(true));
    tile.addEventListener("mouseleave", () => setActive(false));
    tile.addEventListener("focus", () => setActive(true));
    tile.addEventListener("blur", () => setActive(false));
    gallery.append(tile);
  });
}

function createArtGallery(section) {
  const exhibition = document.createElement("section");
  exhibition.className = "art-gallery";
  exhibition.tabIndex = 0;
  exhibition.setAttribute("aria-label", "画廊，滚轮或拖动划页，方向键切换作品");
  const stage = document.createElement("div");
  stage.className = "art-gallery-stage";
  const counter = document.createElement("div");
  counter.className = "art-gallery-counter";
  counter.setAttribute("aria-live", "polite");
  const items = section.items || [];
  const cards = items.map((item, index) => {
    const figure = document.createElement("figure");
    figure.className = "art-gallery-card";
    const image = document.createElement("img");
      image.decoding = "async";
    image.src = item.src;
    image.alt = item.title || `画廊作品 ${index + 1}`;
    image.decoding = "async";
    image.draggable = false;
    image.width = item.width;
    image.height = item.height;
    figure.append(image);
    stage.append(figure);
    return figure;
  });
  exhibition.append(stage, counter);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let current = 0;
  let target = 0;
  let frame = 0;
  let lastTime = 0;
  let pointer = null;
  let mouseX = 0;
  let mouseY = 0;
  let lastIndex = -1;
  const clamp = value => Math.max(0, Math.min(items.length - 1, value));
  const draw = time => {
    const dt = Math.min(32, time - (lastTime || time - 16));
    lastTime = time;
    current += (target - current) * (reduced.matches ? 1 : 1 - Math.exp(-dt / 105));
    if (Math.abs(target - current) < .0005) current = target;
    const height = stage.clientHeight;
    const width = stage.clientWidth;
    const velocity = target - current;
    cards.forEach((card, index) => {
      // Keep neighbouring works visible at both edges, including the first and last work.
      const offset = ((index - current + items.length * 1.5) % items.length) - items.length / 2;
      const distance = Math.abs(offset);
      const direction = offset < 0 ? -1 : 1;
      const x = reduced.matches ? 0 : Math.sign(offset) * Math.min(Math.abs(offset), 1.4) * width * .22 + mouseX * 12;
      // Compress distant cards into a fan instead of spacing them as a long page.
      const spread = distance <= 1 ? distance * .55 : .55 + (distance - 1) * .065;
      const y = direction * spread * height;
      const z = reduced.matches ? 0 : -Math.min(distance, 3) * 65;
      const rx = reduced.matches ? 0 : -offset * 13 - velocity * 16 + mouseY * 3;
      const ry = reduced.matches ? 0 : Math.sin(offset) * 22 + mouseX * 5;
      const rz = reduced.matches ? 0 : direction * Math.min(distance, 2) * -7;
      card.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`;
      card.style.opacity = distance > 3 ? "0" : "1";
      card.style.visibility = distance > 3 ? "hidden" : "visible";
      card.style.zIndex = String(20 - Math.round(distance * 5));
      card.setAttribute("aria-hidden", distance > .6 ? "true" : "false");
    });
    const index = Math.round(current);
    if (index !== lastIndex && items[index]) {
      counter.textContent = `${String(index + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}${items[index].title ? " — " + items[index].title : ""}`;
      lastIndex = index;
      exhibition.dataset.activeIndex = index;
    }
    frame = current !== target ? requestAnimationFrame(draw) : 0;
    if (!frame) lastTime = 0;
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(draw); };
  let settleTimer;
  const settle = () => {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => { target = clamp(Math.round(target)); schedule(); }, 160);
  };
  const wheel = event => {
    event.preventDefault();
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    const pixels = delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientHeight : 1);
    const step = Math.abs(pixels) >= 80 ? Math.sign(pixels) * Math.max(.6, Math.min(1, Math.abs(pixels) / 650)) : pixels / 650;
    target = clamp(target + step);
    schedule();
    settle();
  };
  exhibition.addEventListener("wheel", wheel, { passive: false });
  exhibition.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    clearTimeout(settleTimer);
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, start: target };
    exhibition.setPointerCapture(event.pointerId);
    exhibition.classList.add("is-dragging");
    exhibition.focus({ preventScroll: true });
  });
  exhibition.addEventListener("pointermove", event => {
    const rect = stage.getBoundingClientRect();
    mouseX = (event.clientX - rect.left) / rect.width - .5;
    mouseY = (event.clientY - rect.top) / rect.height - .5;
    if (pointer) {
      const dx = pointer.x - event.clientX;
      const dy = pointer.y - event.clientY;
      target = clamp(pointer.start + (Math.abs(dx) > Math.abs(dy) ? dx : dy) / (stage.clientHeight * .55));
    }
    schedule();
  });
  const release = event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    pointer = null;
    exhibition.classList.remove("is-dragging");
    target = clamp(Math.round(target));
    schedule();
  };
  exhibition.addEventListener("pointerup", release);
  exhibition.addEventListener("pointercancel", release);
  exhibition.addEventListener("lostpointercapture", release);
  exhibition.addEventListener("pointerleave", () => { mouseX = 0; mouseY = 0; schedule(); });
  exhibition.addEventListener("keydown", event => {
    if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End", "PageDown", "PageUp"].includes(event.key)) return;
    event.preventDefault();
    target = clamp(event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : Math.round(target) + (["ArrowDown", "ArrowRight", "PageDown"].includes(event.key) ? 1 : -1));
    schedule();
  });
  document.body.classList.add("art-gallery-open");
  window.addEventListener("resize", schedule);
  reduced.addEventListener("change", schedule);
  schedule();
  disposeArtGallery = () => {
    clearTimeout(settleTimer);
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", schedule);
    reduced.removeEventListener("change", schedule);
    document.body.classList.remove("art-gallery-open");
    disposeArtGallery = () => {};
  };
  return exhibition;
}

function openProject(project, navigate = true) {
  if (project.externalUrl) {
    if (navigate) window.location.assign(project.externalUrl);
    return;
  }
  if (navigate) {
    saveNavigationPosition();
    history.pushState({ view: "project", projectIndex: navigationProjects.indexOf(project), scrollX: 0, scrollY: 0 }, "");
  }
  const gallery = document.querySelector("#gallery");
  const detailView = document.querySelector("#detail-view");
  const detailContent = document.querySelector("#detail-content");
  disposeArtGallery();
  detailContent.replaceChildren();

  (project.detailSections || []).forEach((section) => {
    if (section.type === "art-gallery") {
      detailContent.append(createArtGallery(section));
      return;
    }

    if (section.type === "video") {
      const video = document.createElement("video");
      video.src = section.src;
      video.controls = false;
      video.playsInline = true;
      video.preload = "metadata";
      video.autoplay = project.autoplay !== false;
      video.loop = true;
      video.setAttribute("aria-label", section.label || "作品视频");
      const player = document.createElement("div");
      player.className = "video-player";
      if (section.className) player.classList.add(section.className);
      const controls = document.createElement("div");
      controls.className = "video-controls";
      const icon = (path) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
      const playIcon = icon("M7 4v16l13-8z");
      const pauseIcon = icon("M6 4h4v16H6zm8 0h4v16h-4z");
      const soundIcon = icon("M3 9v6h4l5 4V5L7 9zm12-2v2a4 4 0 010 6v2a6 6 0 000-10zm3-3v2a8 8 0 010 12v2a10 10 0 000-16z");
      controls.innerHTML = `<input class="video-progress" type="range" min="0" max="100" step="0.01" value="0" aria-label="播放进度" disabled>
        <div class="video-toolbar">
          <button type="button" class="video-toggle" aria-label="播放" title="播放 / 暂停（空格）">${playIcon}</button>
          <span class="video-time">00:00 / 00:00</span>
          <span class="video-toolbar-spacer"></span>
          <select class="video-speed" aria-label="播放倍速" title="倍速"><option value="0.5">0.5x</option><option value="0.75">0.75x</option><option value="1" selected>倍速</option><option value="1.25">1.25x</option><option value="1.5">1.5x</option><option value="2">2.0x</option></select>
          <div class="video-volume-group"><button type="button" class="video-mute" aria-label="静音" title="静音（M）">${soundIcon}</button><input class="video-volume" type="range" min="0" max="1" step="0.01" value="1" aria-label="音量"></div>
          <button type="button" class="video-web-fullscreen" aria-label="网页全屏" title="网页全屏">${icon("M3 4h18v16H3zm2 2v12h14V6z")}</button>
          <button type="button" class="video-fullscreen" aria-label="全屏" title="全屏（F）">${icon("M3 3h7v2H5v5H3zm11 0h7v7h-2V5h-5zM3 14h2v5h5v2H3zm16 0h2v7h-7v-2h5z")}</button>
        </div>`;
      const pausedPlay = document.createElement("button");
      pausedPlay.type = "button";
      pausedPlay.className = "video-paused-play";
      pausedPlay.setAttribute("aria-label", "继续播放");
      pausedPlay.innerHTML = playIcon;
      const toggle = controls.querySelector(".video-toggle");
      const progress = controls.querySelector(".video-progress");
      const mute = controls.querySelector(".video-mute");
      const volume = controls.querySelector(".video-volume");
      const time = controls.querySelector(".video-time");
      player.tabIndex = 0;
      const formatTime = (seconds) => {
        const value = Number.isFinite(seconds) ? Math.floor(seconds) : 0;
        return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
      };
      const sync = () => {
        toggle.innerHTML = video.paused ? playIcon : pauseIcon;
        toggle.setAttribute("aria-label", video.paused ? "播放" : "暂停");
        player.classList.toggle("is-paused", video.paused);
        progress.disabled = !Number.isFinite(video.duration) || video.duration <= 0;
        progress.value = progress.disabled ? 0 : video.currentTime / video.duration * 100;
        progress.style.setProperty("--played", `${progress.value}%`);
        time.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
      };
      const togglePlayback = () => {
        if (video.paused) video.play().catch(sync);
        else video.pause();
      };
      const fullscreen = () => {
        if (document.fullscreenElement) document.exitFullscreen?.();
        else if (player.requestFullscreen) {
          fullscreenReturnPosition = { x: window.scrollX, y: window.scrollY };
          player.requestFullscreen().catch(() => { fullscreenReturnPosition = null; });
        }
        else video.webkitEnterFullscreen?.();
      };
      pausedPlay.addEventListener("click", togglePlayback);
      toggle.addEventListener("click", togglePlayback);
      video.addEventListener("click", togglePlayback);
      video.addEventListener("dblclick", fullscreen);
      ["play", "pause", "ended", "timeupdate", "loadedmetadata"].forEach(event => video.addEventListener(event, sync));
      progress.addEventListener("input", () => {
        if (Number.isFinite(video.duration)) video.currentTime = Number(progress.value) / 100 * video.duration;
        sync();
      });
      mute.addEventListener("click", () => { video.muted = !video.muted; });
      volume.addEventListener("input", () => { video.volume = Number(volume.value); video.muted = video.volume === 0; });
      video.addEventListener("volumechange", () => {
        const silent = video.muted || video.volume === 0;
        mute.innerHTML = silent ? icon("M3 9v6h4l5 4V5L7 9zm12-1 2 4-2 4h2l1-2 1 2h2l-2-4 2-4h-2l-1 2-1-2z") : soundIcon;
        mute.setAttribute("aria-label", silent ? "取消静音" : "静音");
        volume.value = video.muted ? 0 : video.volume;
      });
      controls.querySelector(".video-speed").addEventListener("change", event => { video.playbackRate = Number(event.target.value); });
      controls.querySelector(".video-fullscreen").addEventListener("click", fullscreen);
      controls.querySelector(".video-web-fullscreen").addEventListener("click", () => {
        if (!player.classList.contains("web-fullscreen")) {
          fullscreenReturnPosition = { x: window.scrollX, y: window.scrollY };
        }
        const expanded = player.classList.toggle("web-fullscreen");
        document.body.classList.toggle("video-expanded", expanded);
        if (!expanded) restoreVideoPosition();
      });
      player.addEventListener("keydown", event => {
        if (event.target.matches("input, select, button")) return;
        if (event.code === "Space") { event.preventDefault(); togglePlayback(); }
        if (event.key.toLowerCase() === "f") fullscreen();
        if (event.key.toLowerCase() === "m") video.muted = !video.muted;
        if (["ArrowLeft", "ArrowRight"].includes(event.key) && Number.isFinite(video.duration)) {
          event.preventDefault(); video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + (event.key === "ArrowRight" ? 5 : -5)));
        }
        if (event.key === "Escape" && player.classList.contains("web-fullscreen")) {
          event.stopPropagation(); player.classList.remove("web-fullscreen"); document.body.classList.remove("video-expanded");
        }
      });
      sync();
      player.append(video, pausedPlay, controls);
      detailContent.append(player);
      return;
    }

    if (section.type === "image") {
      const image = document.createElement("img");
      image.decoding = "async";
      image.loading = "lazy";
      image.src = section.src;
      image.alt = "";
      detailContent.append(image);
      return;
    }

    if (section.type === "composition") {
      const composition = document.createElement("section");
      composition.className = "layered-composition";
      if (section.className) composition.classList.add(section.className);

      if (section.aspectRatio) composition.style.aspectRatio = section.aspectRatio;

      if (section.background) {
      const background = document.createElement("img");
      background.className = "composition-background";
      background.src = section.background;
      background.alt = "";
      composition.append(background);
      }

      (section.layers || []).forEach((layer) => {
        const image = document.createElement("img");
      image.decoding = "async";
        image.className = `composition-layer${layer.shape ? ` composition-layer--${layer.shape}` : ""}`;
        image.src = layer.src;
        image.alt = "";
        image.style.left = layer.left;
        image.style.top = layer.top;
        image.style.width = layer.width;
        image.style.zIndex = layer.zIndex || 1;
        composition.append(image);
      });

      (section.textLayers || []).forEach((layer) => {
        const copy = document.createElement("div");
        copy.className = "composition-text";
        if (layer.effect) copy.classList.add(`composition-text--${layer.effect}`);
        Object.assign(copy.style, {
          left: layer.left, top: layer.top, width: layer.width,
          fontSize: `${layer.fontSize / 14.4}cqw`,
          fontWeight: layer.fontWeight || 400, lineHeight: layer.lineHeight || 1.2,
          textAlign: layer.align || "left", color: layer.color || "#000",
          zIndex: layer.zIndex || 3,
        });
        (layer.lines || []).forEach((line) => {
          const row = document.createElement("div");
          (Array.isArray(line) ? line : [{ text: line }]).forEach((part) => {
            const span = document.createElement(part.bold ? "strong" : "span");
            span.textContent = part.text;
            row.append(span);
          });
          copy.append(row);
        });
        composition.append(copy);
      });

      detailContent.append(composition);
      return;
    }

    if (section.type === "concept") {
      const concept = document.createElement("section");
      concept.className = "concept-section";

      const background = document.createElement("img");
      background.className = "concept-background";
      background.src = section.background;
      background.alt = "";
      concept.append(background);

      (section.copyImages || []).forEach((copy) => {
        const image = document.createElement("img");
      image.decoding = "async";
        image.className = `concept-copy concept-copy--${copy.position}`;
        image.src = copy.src;
        image.alt = "";
        concept.append(image);
      });

      if (section.dividerImage) {
        const divider = document.createElement("img");
        divider.className = "concept-divider";
        divider.src = section.dividerImage;
        divider.alt = "";
        concept.append(divider);
      }

      detailContent.append(concept);
    }
  });

  gallery.hidden = true;
  detailView.hidden = false;
  detailContent.querySelectorAll("video").forEach(video => {
    if (!video.autoplay) return;
    video.play().catch(() => {
      // Browsers can require muted playback when sound autoplay is blocked.
      video.muted = true;
      video.play().catch(() => {});
    });
  });
  window.scrollTo(0, 0);
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const expandedPlayer = document.querySelector(".video-player.web-fullscreen");
  if (expandedPlayer) {
    event.preventDefault();
    event.stopImmediatePropagation();
    expandedPlayer.classList.remove("web-fullscreen");
    document.body.classList.remove("video-expanded");
    restoreVideoPosition();
    return;
  }
  // Let the browser leave native fullscreen without closing the project.
  if (document.fullscreenElement || performance.now() - fullscreenExitTime < 350) return;
  const detailView = document.querySelector("#detail-view");
  if (event.key === "Escape" && !detailView.hidden) {
    history.back();
  }
}, true);

fetch("./content.json")
  .then((response) => {
    if (!response.ok) throw new Error("内容配置读取失败");
    return response.json();
  })
  .then((content) => {
    navigationProjects = content.projects || [];
    if (!history.state?.view) history.replaceState({ view: "home", scrollX: 0, scrollY: 0 }, "");
    renderProfile(content.profile || {});
    renderProjects(content.projects || []);
    renderGallery(content.projects || []);
    showNavigationState();
  })
  .catch((error) => console.error(error));
