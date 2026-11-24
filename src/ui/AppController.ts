import {
  ALL_FLOOR_SPACES,
  CAMERA_PRESETS,
  FINISH_PRESETS,
  PROPERTY_OVERVIEW,
  ROOMS,
  formatArea,
  formatCurrency,
  formatDimension,
  formatHeight,
  type CutawayMode,
  type FinishId,
  type RoomSpec,
  type UnitSystem,
} from '../data/propertyData';
import {
  ALL_SITE_ROUTES,
  getCurrentRoutePath,
  navigateToPath,
  parseRoute,
  type ParsedRoute,
} from '../router/routes';
import {
  RealEstateEngine,
  type ProjectedDimension,
  type ProjectedPin,
} from '../scene/RealEstateEngine';

type DockTab = 'layers' | 'rooms' | 'sunlight';

export class AppController {
  private rootEl: HTMLElement;
  private engine: RealEstateEngine;

  // Application State
  private route: ParsedRoute;
  private cutawayMode: CutawayMode = 'full';
  private finishId: FinishId = 'limestone';
  private unitSystem: UnitSystem = 'imperial';
  private timeOfDay = 15.2;
  private showLabels = true;
  private showDimensions = false;
  private dockCollapsed = false;
  private activeDockTab: DockTab = 'layers';
  private activeRoom: RoomSpec | null = null;
  private shareModalOpen = false;
  private mobileMenuOpen = false;
  private xrSupportedMode: 'immersive-ar' | 'immersive-vr' | null = null;
  private xrActive = false;
  private webglLost = false;

  // Mortgage calculator state
  private downPaymentPct = 20;
  private interestRate = 6.25;
  private loanTermYears = 30;
  private viewingRequested = false;

  // DOM refs
  private pinsLayerEl!: HTMLDivElement;
  private dimsLayerEl!: HTMLDivElement;
  private pinElements = new Map<string, HTMLButtonElement>();
  private dimElements = new Map<string, HTMLDivElement>();
  private headerEl!: HTMLElement;
  private propertySummaryEl!: HTMLDivElement;
  private roomCardEl!: HTMLDivElement;
  private dockWrapperEl!: HTMLDivElement;
  private specsOverlayEl!: HTMLDivElement;
  private shareModalEl!: HTMLDivElement;
  private toastEl!: HTMLDivElement;
  private webglFallbackEl!: HTMLDivElement;
  private toastTimer = 0;

  constructor(rootEl: HTMLElement) {
    this.rootEl = rootEl;
    this.route = parseRoute(getCurrentRoutePath());

    this.buildShellDOM();

    const viewportMount = this.rootEl.querySelector('#viewport-mount') as HTMLElement;
    this.engine = new RealEstateEngine(viewportMount, {
      onProjectUpdate: (pins, dims) => this.updateProjectedOverlays(pins, dims),
      onWebGLContextLost: () => {
        this.webglLost = true;
        this.renderWebGLFallback();
      },
      onWebGLContextRestored: () => {
        this.webglLost = false;
        this.renderWebGLFallback();
      },
      onXRSupportChange: (mode) => {
        this.xrSupportedMode = mode;
        this.renderDock();
      },
      onXRSessionChange: (active) => {
        this.xrActive = active;
        this.renderDock();
      },
    });

    window.addEventListener('popstate', this.handlePopState);
    window.addEventListener('hashchange', this.handlePopState);
    window.addEventListener('keydown', this.handleKeyDown);

    this.applyRoute(this.route, true);
  }

  private buildShellDOM(): void {
    this.rootEl.innerHTML = `
      <div id="viewport-mount" aria-label="Interactive 3D view of The Ridgeview Residence"></div>

      <!-- Projected 3D Room Pins & Dimension Callouts -->
      <div id="pins-layer" class="fixed inset-0 z-10 pointer-events-none overflow-hidden"></div>
      <div id="dims-layer" class="fixed inset-0 z-10 pointer-events-none overflow-hidden"></div>

      <!-- Top Bar (3-Zone Contract) -->
      <header id="app-header" class="fixed top-0 inset-x-0 z-30 h-14 px-4 sm:px-6 flex items-center justify-between gap-4 sm:gap-8 bg-[#10141a]/92 border-b border-white/10"></header>

      <!-- Quiet Property Metadata Strip (Unboxed Typography, Zero Pills) -->
      <div id="property-summary" class="fixed top-[66px] left-4 sm:left-6 z-20 pointer-events-none max-w-[85vw]"></div>

      <!-- Room Insight Card (Shown above dock only when inspecting a specific room) -->
      <div id="room-card-host" class="fixed z-20 left-1/2 -translate-x-1/2 w-[min(640px,94vw)] pointer-events-none transition-transform duration-200"></div>

      <!-- Unified Collapsible Bottom Control Dock -->
      <div id="dock-wrapper" class="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[min(920px,94vw)] pointer-events-none flex flex-col items-center"></div>

      <!-- Specs & Mortgage Sheet (/specs) -->
      <div id="specs-overlay" class="fixed inset-0 z-40 hidden"></div>

      <!-- Share Buyer Link Modal -->
      <div id="share-modal" class="fixed inset-0 z-50 hidden"></div>

      <!-- WebGL Fallback Notice -->
      <div id="webgl-fallback" class="fixed inset-0 z-50 hidden items-center justify-center bg-[#0e1116] p-6 text-center"></div>

      <!-- Crisp Copy/Action Toast -->
      <div id="toast-banner" role="status" aria-live="polite" class="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-[#181e27] border border-amber-500/40 text-sm text-slate-100 shadow-lg opacity-0 pointer-events-none transition-opacity duration-200"></div>
    `;

    this.pinsLayerEl = this.rootEl.querySelector('#pins-layer') as HTMLDivElement;
    this.dimsLayerEl = this.rootEl.querySelector('#dims-layer') as HTMLDivElement;
    this.headerEl = this.rootEl.querySelector('#app-header') as HTMLElement;
    this.propertySummaryEl = this.rootEl.querySelector('#property-summary') as HTMLDivElement;
    this.roomCardEl = this.rootEl.querySelector('#room-card-host') as HTMLDivElement;
    this.dockWrapperEl = this.rootEl.querySelector('#dock-wrapper') as HTMLDivElement;
    this.specsOverlayEl = this.rootEl.querySelector('#specs-overlay') as HTMLDivElement;
    this.shareModalEl = this.rootEl.querySelector('#share-modal') as HTMLDivElement;
    this.toastEl = this.rootEl.querySelector('#toast-banner') as HTMLDivElement;
    this.webglFallbackEl = this.rootEl.querySelector('#webgl-fallback') as HTMLDivElement;

    this.initProjectedElements();
  }

  private initProjectedElements(): void {
    ROOMS.forEach((room) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.roomId = room.id;
      btn.className =
        'absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-md bg-[#10141a]/90 border border-white/15 text-xs font-medium text-slate-100 hover:border-amber-500/80 hover:text-amber-200 transition-colors whitespace-nowrap shadow-md min-h-[32px] hidden';
      btn.addEventListener('click', () => {
        this.navigate(`/rooms/${room.slug}`);
      });
      this.pinsLayerEl.appendChild(btn);
      this.pinElements.set(room.id, btn);
    });
  }

  private updateProjectedOverlays(pins: ProjectedPin[], dims: ProjectedDimension[]): void {
    const suppressOverlays = this.route.kind === 'specs' || this.shareModalOpen;

    for (const pin of pins) {
      const el = this.pinElements.get(pin.id);
      if (!el) continue;
      if (!this.showLabels || !pin.visible || suppressOverlays) {
        el.style.display = 'none';
        continue;
      }
      const room = ROOMS.find((r) => r.id === pin.id);
      if (!room) continue;
      const isSelected = this.activeRoom?.id === room.id;
      el.style.display = 'inline-flex';
      el.style.alignItems = 'center';
      el.style.gap = '6px';
      el.style.transform = `translate3d(${pin.x.toFixed(1)}px, ${pin.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      el.className = `absolute pointer-events-auto px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shadow-md min-h-[32px] ${
        isSelected
          ? 'bg-amber-600 text-white border border-amber-400'
          : 'bg-[#10141a]/90 text-slate-100 border border-white/15 hover:border-amber-500/80'
      }`;
      el.innerHTML = `<span>${room.name}</span><span class="opacity-65 font-mono-tabular text-[11px]">${formatArea(room.areaSqFt, this.unitSystem)}</span>`;
    }

    // Dimension overlays
    const seenDims = new Set<string>();
    for (const d of dims) {
      seenDims.add(d.id);
      let el = this.dimElements.get(d.id);
      if (!el) {
        el = document.createElement('div');
        el.className =
          'absolute pointer-events-none px-2 py-0.5 rounded bg-[#10141a]/92 border border-amber-500/40 text-[11px] font-mono-tabular font-medium text-amber-300 whitespace-nowrap';
        this.dimsLayerEl.appendChild(el);
        this.dimElements.set(d.id, el);
      }
      if (!this.showDimensions || !d.visible || suppressOverlays) {
        el.style.display = 'none';
      } else {
        el.style.display = 'block';
        el.textContent = this.unitSystem === 'metric' ? d.metric : d.imperial;
        el.style.transform = `translate3d(${d.x.toFixed(1)}px, ${d.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      }
    }
    this.dimElements.forEach((el, id) => {
      if (!seenDims.has(id)) {
        el.style.display = 'none';
      }
    });
  }

  public navigate(path: string): void {
    navigateToPath(path);
    this.mobileMenuOpen = false;
    this.applyRoute(parseRoute(path), false);
  }

  private handlePopState = (): void => {
    this.applyRoute(parseRoute(getCurrentRoutePath()), false);
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.key === 'h' || e.key === 'H') {
      if (this.route.kind !== 'specs' && !this.shareModalOpen) {
        this.dockCollapsed = !this.dockCollapsed;
        this.renderDock();
        this.renderRoomCard();
      }
    } else if (e.key === 'Escape') {
      if (this.shareModalOpen) {
        this.shareModalOpen = false;
        this.renderShareModal();
        this.engine.requestRender();
      } else if (this.route.kind === 'specs') {
        this.navigate('/');
      }
    }
  };

  private applyRoute(parsed: ParsedRoute, initial: boolean): void {
    this.route = parsed;

    if (parsed.kind === 'overview') {
      this.activeRoom = null;
      this.activeDockTab = 'layers';
      this.cutawayMode = 'full';
      this.engine.setCutawayMode('full');
      this.engine.flyTo(CAMERA_PRESETS.overview.pos, CAMERA_PRESETS.overview.target);
    } else if (parsed.kind === 'floorplan') {
      this.activeRoom = null;
      this.activeDockTab = 'layers';
      this.cutawayMode = 'ground';
      this.showLabels = true;
      this.showDimensions = true;
      this.engine.setShowDimensions(true);
      this.engine.setCutawayMode('ground');
      this.engine.flyTo(CAMERA_PRESETS.floorplan.pos, CAMERA_PRESETS.floorplan.target);
    } else if (parsed.kind === 'rooms' || parsed.kind === 'room-detail') {
      const targetRoom = parsed.room ?? ROOMS[0];
      this.activeRoom = targetRoom;
      this.activeDockTab = 'rooms';
      this.cutawayMode = targetRoom.recommendedCutaway;
      this.engine.setCutawayMode(targetRoom.recommendedCutaway);
      this.engine.flyTo(targetRoom.camPos, targetRoom.camTarget);
    } else if (parsed.kind === 'sunlight') {
      this.activeRoom = null;
      this.activeDockTab = 'sunlight';
      this.cutawayMode = 'full';
      this.engine.setCutawayMode('full');
      if (initial) {
        this.timeOfDay = 17.5;
        this.engine.setTimeOfDay(this.timeOfDay);
      }
      this.engine.flyTo(CAMERA_PRESETS.sunlight.pos, CAMERA_PRESETS.sunlight.target);
    } else if (parsed.kind === 'specs') {
      // Keep current 3D scene softly visible behind the sheet
    }

    this.renderAll();
    this.engine.requestRender();
  }

  private renderAll(): void {
    this.renderHeader();
    this.renderPropertySummary();
    this.renderRoomCard();
    this.renderDock();
    this.renderSpecsOverlay();
    this.renderShareModal();
    this.renderWebGLFallback();
  }

  private renderHeader(): void {
    const navItems = [
      { label: 'Overview', path: '/', active: this.route.kind === 'overview' },
      { label: 'Floorplan', path: '/floorplan', active: this.route.kind === 'floorplan' },
      {
        label: 'Rooms',
        path: '/rooms',
        active: this.route.kind === 'rooms' || this.route.kind === 'room-detail',
      },
      { label: 'Sunlight', path: '/sunlight', active: this.route.kind === 'sunlight' },
      { label: 'Specs', path: '/specs', active: this.route.kind === 'specs' },
    ];

    this.headerEl.innerHTML = `
      <!-- Zone 1: Single-line Brand Wordmark -->
      <a href="/" data-nav="/" class="font-display text-base sm:text-lg font-semibold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-amber-300 transition-colors">
        Ridgeview
      </a>

      <!-- Zone 2: 5 Concise Single-Line Nav Links (Desktop) -->
      <nav aria-label="Primary navigation" class="hidden md:flex items-center gap-6 text-sm font-medium">
        ${navItems
          .map(
            (item) => `
          <a
            href="${item.path}"
            data-nav="${item.path}"
            class="whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
              item.active
                ? 'text-white border-amber-500'
                : 'text-slate-300 border-transparent hover:text-white hover:border-white/30'
            }"
          >${item.label}</a>
        `
          )
          .join('')}
      </nav>

      <!-- Zone 3: 1 Primary CTA Action (plus compact mobile menu trigger on narrow screens) -->
      <div class="flex items-center gap-2 shrink-0">
        <button
          type="button"
          id="btn-open-share"
          class="px-3.5 sm:px-4 py-2 min-h-[40px] rounded-lg bg-amber-600 hover:bg-amber-500 text-xs sm:text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0"
        >
          Share Link
        </button>
        <button
          type="button"
          id="btn-mobile-menu"
          aria-label="Open navigation menu"
          aria-expanded="${this.mobileMenuOpen}"
          class="md:hidden inline-flex items-center justify-center w-10 h-10 min-h-[44px] min-w-[44px] rounded-lg border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            ${
              this.mobileMenuOpen
                ? '<path d="M18 6L6 18M6 6l12 12"/>'
                : '<path d="M4 7h16M4 12h16M4 17h16"/>'
            }
          </svg>
        </button>
      </div>

      ${
        this.mobileMenuOpen
          ? `
        <div class="md:hidden fixed top-14 inset-x-0 bg-[#10141a] border-b border-white/12 px-4 py-3 flex flex-col gap-1 shadow-xl z-40">
          ${navItems
            .map(
              (item) => `
            <a
              href="${item.path}"
              data-nav="${item.path}"
              class="px-3 py-2.5 min-h-[44px] flex items-center rounded-lg text-sm font-medium ${
                item.active ? 'bg-amber-600/20 text-amber-300' : 'text-slate-200 hover:bg-white/5'
              }"
            >${item.label}</a>
          `
            )
            .join('')}
        </div>
      `
          : ''
      }
    `;

    this.headerEl.querySelectorAll<HTMLAnchorElement>('[data-nav]').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const targetPath = a.dataset.nav || '/';
        this.navigate(targetPath);
      });
    });

    this.headerEl.querySelector('#btn-open-share')?.addEventListener('click', () => {
      this.shareModalOpen = true;
      this.mobileMenuOpen = false;
      this.renderHeader();
      this.renderShareModal();
      this.engine.requestRender();
    });

    this.headerEl.querySelector('#btn-mobile-menu')?.addEventListener('click', () => {
      this.mobileMenuOpen = !this.mobileMenuOpen;
      this.renderHeader();
    });
  }

  private renderPropertySummary(): void {
    if (this.route.kind === 'specs') {
      this.propertySummaryEl.innerHTML = '';
      return;
    }

    const areaText = formatArea(PROPERTY_OVERVIEW.totalSqFt, this.unitSystem);
    this.propertySummaryEl.innerHTML = `
      <div class="inline-block px-3 py-2 rounded-lg bg-[#10141a]/82 border border-white/10">
        <div class="font-display text-sm sm:text-base font-semibold text-white leading-snug">
          ${PROPERTY_OVERVIEW.title}
        </div>
        <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-300 font-mono-tabular mt-0.5">
          <span class="text-amber-300 font-medium">${formatCurrency(PROPERTY_OVERVIEW.price)}</span>
          <span aria-hidden="true" class="text-slate-500">·</span>
          <span>${areaText}</span>
          <span aria-hidden="true" class="text-slate-500">·</span>
          <span>${PROPERTY_OVERVIEW.beds} Bed</span>
          <span aria-hidden="true" class="text-slate-500">·</span>
          <span>${PROPERTY_OVERVIEW.baths} Bath</span>
        </div>
      </div>
    `;
  }

  private renderRoomCard(): void {
    if (!this.activeRoom || this.route.kind === 'specs') {
      this.roomCardEl.innerHTML = '';
      return;
    }

    const room = this.activeRoom;
    const idx = ROOMS.findIndex((r) => r.id === room.id);
    const prevRoom = ROOMS[(idx - 1 + ROOMS.length) % ROOMS.length];
    const nextRoom = ROOMS[(idx + 1) % ROOMS.length];
    const bottomOffset = this.dockCollapsed ? 'bottom-[70px]' : 'bottom-[152px] sm:bottom-[142px]';
    this.roomCardEl.className = `fixed z-20 ${bottomOffset} left-1/2 -translate-x-1/2 w-[min(640px,94vw)] pointer-events-none transition-all duration-200`;

    this.roomCardEl.innerHTML = `
      <div class="pointer-events-auto rounded-xl bg-[#10141a]/92 border border-white/12 px-4 py-3 shadow-xl">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
              <span>${room.floor}</span>
              <span aria-hidden="true">·</span>
              <span class="font-mono-tabular text-amber-300">${formatArea(room.areaSqFt, this.unitSystem)}</span>
              <span aria-hidden="true">·</span>
              <span class="font-mono-tabular">${formatDimension(room.widthFt, room.lengthFt, this.unitSystem)}</span>
              <span aria-hidden="true">·</span>
              <span>Ceiling ${formatHeight(room.ceilingFt, this.unitSystem)}</span>
            </div>
            <h2 class="font-display text-base sm:text-lg font-semibold text-white mt-0.5 truncate">${room.name}</h2>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" id="btn-prev-room" aria-label="Previous room" class="px-2.5 py-1.5 min-h-[36px] rounded-md bg-white/8 hover:bg-white/15 text-xs font-medium text-slate-200 whitespace-nowrap">Prev</button>
            <button type="button" id="btn-next-room" aria-label="Next room" class="px-2.5 py-1.5 min-h-[36px] rounded-md bg-amber-600 hover:bg-amber-500 text-xs font-medium text-white whitespace-nowrap">Next</button>
            <button type="button" id="btn-close-room" aria-label="Exit room focus" class="w-9 h-9 rounded-md hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <p class="text-xs sm:text-sm text-slate-300 leading-relaxed mt-1.5">${room.summary}</p>
        <div class="hidden sm:flex items-center gap-4 mt-2 pt-2 border-t border-white/10 text-xs text-slate-400">
          <span>${room.highlights[0]}</span>
          <span aria-hidden="true" class="text-slate-600">|</span>
          <span>Exposure: ${room.exposure}</span>
        </div>
      </div>
    `;

    this.roomCardEl.querySelector('#btn-prev-room')?.addEventListener('click', () => {
      this.navigate(`/rooms/${prevRoom.slug}`);
    });
    this.roomCardEl.querySelector('#btn-next-room')?.addEventListener('click', () => {
      this.navigate(`/rooms/${nextRoom.slug}`);
    });
    this.roomCardEl.querySelector('#btn-close-room')?.addEventListener('click', () => {
      this.navigate('/');
    });
  }

  private renderDock(): void {
    if (this.route.kind === 'specs') {
      this.dockWrapperEl.innerHTML = '';
      return;
    }

    const sunDisplay = this.formatClock(this.timeOfDay);
    const sunPhase = this.getSunPhaseLabel(this.timeOfDay);

    const cutawayOptions: Array<{ id: CutawayMode; label: string }> = [
      { id: 'full', label: 'Full Home' },
      { id: 'upper', label: 'Upper Plan' },
      { id: 'ground', label: 'Ground Plan' },
      { id: 'exploded', label: 'Exploded' },
    ];

    const tabButton = (tab: DockTab, label: string) => `
      <button
        type="button"
        data-dock-tab="${tab}"
        class="px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
          this.activeDockTab === tab
            ? 'bg-amber-600 text-white'
            : 'text-slate-300 hover:text-white hover:bg-white/8'
        }"
      >${label}</button>
    `;

    let tabBody = '';
    if (this.activeDockTab === 'layers') {
      tabBody = `
        <div class="flex flex-wrap items-center justify-between gap-2.5">
          <!-- Cutaway Floorplan Mode -->
          <div class="flex items-center gap-1 p-1 rounded-lg bg-white/6 overflow-x-auto no-scrollbar max-w-full">
            ${cutawayOptions
              .map(
                (opt) => `
              <button
                type="button"
                data-cutaway="${opt.id}"
                class="px-2.5 sm:px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  this.cutawayMode === opt.id
                    ? 'bg-slate-100 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }"
              >${opt.label}</button>
            `
              )
              .join('')}
          </div>

          <!-- Exterior Finish Swatches -->
          <div class="flex items-center gap-1.5">
            <span class="text-xs text-slate-400 mr-1 hidden sm:inline">Finish</span>
            ${FINISH_PRESETS.map(
              (f) => `
              <button
                type="button"
                data-finish="${f.id}"
                title="${f.name}"
                class="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-md border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  this.finishId === f.id
                    ? 'border-amber-500 bg-white/12 text-white'
                    : 'border-white/12 bg-white/4 text-slate-300 hover:border-white/30'
                }"
              >
                <span class="w-3 h-3 rounded-full border border-black/30 shrink-0" style="background:${f.swatchPrimary}"></span>
                <span>${f.shortLabel}</span>
              </button>
            `
            ).join('')}
          </div>
        </div>
      `;
    } else if (this.activeDockTab === 'rooms') {
      tabBody = `
        <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          ${ROOMS.map(
            (r) => `
            <button
              type="button"
              data-jump-room="${r.slug}"
              class="px-3 py-2 min-h-[40px] rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                this.activeRoom?.id === r.id
                  ? 'border-amber-500 bg-amber-600 text-white'
                  : 'border-white/12 bg-white/6 text-slate-200 hover:border-white/30 hover:bg-white/10'
              }"
            >
              ${r.name}
            </button>
          `
          ).join('')}
        </div>
      `;
    } else {
      const presets = [
        { label: 'Morning', hour: 8.5 },
        { label: 'Noon', hour: 12.75 },
        { label: 'Golden Hour', hour: 17.6 },
        { label: 'Evening', hour: 20.4 },
      ];
      tabBody = `
        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <span class="font-mono-tabular text-xs font-semibold text-amber-300 w-16 shrink-0">${sunDisplay}</span>
            <input
              type="range"
              id="sun-slider"
              min="6.5"
              max="21.0"
              step="0.1"
              value="${this.timeOfDay.toFixed(1)}"
              aria-label="Time of day sunlight simulation"
              class="studio-slider flex-1 min-w-[120px]"
            />
            <span class="text-xs text-slate-300 whitespace-nowrap shrink-0 hidden sm:inline">${sunPhase}</span>
          </div>
          <div class="flex items-center gap-1 overflow-x-auto no-scrollbar">
            ${presets
              .map(
                (p) => `
              <button
                type="button"
                data-sun-preset="${p.hour}"
                class="px-2.5 py-1.5 min-h-[36px] rounded-md text-xs font-medium whitespace-nowrap shrink-0 ${
                  Math.abs(this.timeOfDay - p.hour) < 0.45
                    ? 'bg-slate-100 text-slate-950'
                    : 'bg-white/6 text-slate-300 hover:text-white'
                }"
              >${p.label}</button>
            `
              )
              .join('')}
          </div>
        </div>
      `;
    }

    this.dockWrapperEl.innerHTML = `
      <!-- Collapse / Expand Drawer Handle -->
      <button
        type="button"
        id="btn-toggle-dock"
        class="pointer-events-auto mb-1.5 px-3.5 py-1.5 min-h-[34px] rounded-lg bg-[#10141a]/90 border border-white/12 text-xs font-medium text-slate-200 hover:text-white hover:border-white/25 transition-colors flex items-center gap-1.5 shadow-md"
      >
        <span>${this.dockCollapsed ? 'Show Controls' : 'Hide Controls'}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          ${this.dockCollapsed ? '<path d="M18 15l-6-6-6 6"/>' : '<path d="M6 9l6 6 6-6"/>'}
        </svg>
      </button>

      <!-- Main Horizontal Bottom Control Dock -->
      <div
        class="pointer-events-auto w-full rounded-xl bg-[#10141a]/92 border border-white/12 px-3 sm:px-4 py-2.5 shadow-2xl transition-all duration-200 ${
          this.dockCollapsed ? 'hidden' : 'block'
        }"
      >
        <div class="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-white/10 overflow-x-auto no-scrollbar">
          <div class="flex items-center gap-1 shrink-0">
            ${tabButton('layers', 'Cutaway & Finishes')}
            ${tabButton('rooms', 'Rooms')}
            ${tabButton('sunlight', 'Sunlight')}
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              id="btn-toggle-labels"
              class="px-2.5 py-1.5 min-h-[34px] rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                this.showLabels
                  ? 'bg-white/14 text-white border border-white/20'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }"
            >Labels</button>
            <button
              type="button"
              id="btn-toggle-dims"
              class="px-2.5 py-1.5 min-h-[34px] rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                this.showDimensions
                  ? 'bg-white/14 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }"
            >Dimensions</button>
            <button
              type="button"
              id="btn-toggle-units"
              class="px-2.5 py-1.5 min-h-[34px] rounded-md text-xs font-mono-tabular font-medium text-slate-300 hover:text-white bg-white/6 whitespace-nowrap"
            >${this.unitSystem === 'imperial' ? 'ft / sq ft' : 'm / m²'}</button>
            <button
              type="button"
              id="btn-reset-cam"
              class="px-2.5 py-1.5 min-h-[34px] rounded-md text-xs font-medium text-slate-300 hover:text-white bg-white/6 whitespace-nowrap"
            >Reset</button>
            ${
              this.xrSupportedMode
                ? `
              <button
                type="button"
                id="btn-toggle-xr"
                class="px-3 py-1.5 min-h-[34px] rounded-md text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white whitespace-nowrap"
              >${this.xrActive ? 'Exit XR' : 'Tabletop XR'}</button>
            `
                : ''
            }
          </div>
        </div>
        <div>${tabBody}</div>
      </div>
    `;

    // Wire dock event handlers
    this.dockWrapperEl.querySelector('#btn-toggle-dock')?.addEventListener('click', () => {
      this.dockCollapsed = !this.dockCollapsed;
      this.renderDock();
      this.renderRoomCard();
    });

    this.dockWrapperEl.querySelectorAll<HTMLButtonElement>('[data-dock-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextTab = btn.dataset.dockTab as DockTab;
        this.activeDockTab = nextTab;
        this.renderDock();
      });
    });

    this.dockWrapperEl.querySelectorAll<HTMLButtonElement>('[data-cutaway]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.cutaway as CutawayMode;
        this.cutawayMode = mode;
        this.engine.setCutawayMode(mode);
        if (mode === 'exploded') {
          this.engine.flyTo(CAMERA_PRESETS.exploded.pos, CAMERA_PRESETS.exploded.target);
        } else if (mode === 'ground' || mode === 'upper') {
          this.engine.flyTo(CAMERA_PRESETS.floorplan.pos, CAMERA_PRESETS.floorplan.target);
        } else {
          this.engine.flyTo(CAMERA_PRESETS.overview.pos, CAMERA_PRESETS.overview.target);
        }
        this.renderDock();
      });
    });

    this.dockWrapperEl.querySelectorAll<HTMLButtonElement>('[data-finish]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const finish = btn.dataset.finish as FinishId;
        this.finishId = finish;
        this.engine.setFinishPreset(finish);
        this.renderDock();
      });
    });

    this.dockWrapperEl.querySelectorAll<HTMLButtonElement>('[data-jump-room]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const slug = btn.dataset.jumpRoom;
        if (slug) this.navigate(`/rooms/${slug}`);
      });
    });

    const slider = this.dockWrapperEl.querySelector('#sun-slider') as HTMLInputElement | null;
    if (slider) {
      slider.addEventListener('input', () => {
        this.timeOfDay = parseFloat(slider.value);
        this.engine.setTimeOfDay(this.timeOfDay);
        // Lightweight inline readout update without tearing down the active range input
        const timeText = this.dockWrapperEl.querySelector('.font-mono-tabular.text-amber-300');
        if (timeText) timeText.textContent = this.formatClock(this.timeOfDay);
      });
      slider.addEventListener('change', () => {
        this.renderDock();
      });
    }

    this.dockWrapperEl.querySelectorAll<HTMLButtonElement>('[data-sun-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const hr = parseFloat(btn.dataset.sunPreset || '15');
        this.timeOfDay = hr;
        this.engine.setTimeOfDay(hr);
        this.renderDock();
      });
    });

    this.dockWrapperEl.querySelector('#btn-toggle-labels')?.addEventListener('click', () => {
      this.showLabels = !this.showLabels;
      this.renderDock();
      this.engine.requestRender();
    });

    this.dockWrapperEl.querySelector('#btn-toggle-dims')?.addEventListener('click', () => {
      this.showDimensions = !this.showDimensions;
      this.engine.setShowDimensions(this.showDimensions);
      this.renderDock();
    });

    this.dockWrapperEl.querySelector('#btn-toggle-units')?.addEventListener('click', () => {
      this.unitSystem = this.unitSystem === 'imperial' ? 'metric' : 'imperial';
      this.renderPropertySummary();
      this.renderRoomCard();
      this.renderDock();
      this.renderSpecsOverlay();
      this.engine.requestRender();
    });

    this.dockWrapperEl.querySelector('#btn-reset-cam')?.addEventListener('click', () => {
      this.activeRoom = null;
      this.cutawayMode = 'full';
      this.engine.setCutawayMode('full');
      this.engine.resetView();
      if (this.route.kind !== 'overview') {
        navigateToPath('/');
        this.route = parseRoute('/');
        this.renderHeader();
      }
      this.renderRoomCard();
      this.renderDock();
    });

    this.dockWrapperEl.querySelector('#btn-toggle-xr')?.addEventListener('click', () => {
      void this.engine.toggleXRSession();
    });
  }

  private renderSpecsOverlay(): void {
    if (this.route.kind !== 'specs') {
      this.specsOverlayEl.classList.add('hidden');
      this.specsOverlayEl.innerHTML = '';
      return;
    }

    this.specsOverlayEl.classList.remove('hidden');

    const mortgage = this.calculateMortgage();

    this.specsOverlayEl.innerHTML = `
      <div class="fixed inset-0 top-14 bg-[#0e1116]/94 overflow-y-auto thin-scroll px-4 sm:px-8 py-6 sm:py-10">
        <div class="max-w-5xl mx-auto">
          <!-- Header row -->
          <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <div class="text-xs text-slate-400">
                ${PROPERTY_OVERVIEW.address} · Built ${PROPERTY_OVERVIEW.yearBuilt} · ${PROPERTY_OVERVIEW.architecturalStyle}
              </div>
              <h1 class="font-display text-2xl sm:text-4xl font-semibold text-white tracking-tight mt-1">
                ${PROPERTY_OVERVIEW.title}
              </h1>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <button
                type="button"
                id="btn-specs-units"
                class="px-3.5 py-2 min-h-[40px] rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-mono-tabular text-slate-200 whitespace-nowrap"
              >Units: ${this.unitSystem === 'imperial' ? 'Imperial (ft)' : 'Metric (m)'}</button>
              <button
                type="button"
                id="btn-specs-back"
                class="px-4 py-2 min-h-[40px] rounded-lg bg-amber-600 hover:bg-amber-500 text-xs sm:text-sm font-medium text-white whitespace-nowrap"
              >Back to 3D Tour</button>
            </div>
          </div>

          <!-- 4-Column Verified Property KPI Strip -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 py-6 border-b border-white/10">
            <div>
              <div class="text-xs text-slate-400">Offering Price</div>
              <div class="font-mono-tabular text-xl sm:text-2xl font-semibold text-amber-300 mt-1">${formatCurrency(PROPERTY_OVERVIEW.price)}</div>
            </div>
            <div>
              <div class="text-xs text-slate-400">Interior Living Area</div>
              <div class="font-mono-tabular text-xl sm:text-2xl font-semibold text-white mt-1">${formatArea(PROPERTY_OVERVIEW.totalSqFt, this.unitSystem)}</div>
            </div>
            <div>
              <div class="text-xs text-slate-400">Parcel Lot Area</div>
              <div class="font-mono-tabular text-xl sm:text-2xl font-semibold text-white mt-1">${formatArea(PROPERTY_OVERVIEW.lotSqFt, this.unitSystem)}</div>
            </div>
            <div>
              <div class="text-xs text-slate-400">Configuration</div>
              <div class="font-mono-tabular text-xl sm:text-2xl font-semibold text-white mt-1">${PROPERTY_OVERVIEW.beds} Bed · ${PROPERTY_OVERVIEW.baths} Bath</div>
            </div>
          </div>

          <!-- Main 2-Column Content: Room Dimensions Table + Mortgage & Viewing -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 py-8">
            <!-- Left 7 cols: Room-by-Room Schedule -->
            <div class="lg:col-span-7">
              <div class="flex items-center justify-between mb-4">
                <h2 class="font-display text-lg font-semibold text-white">Room-by-Room Dimension Schedule</h2>
                <span class="text-xs text-slate-400">Click featured spaces to inspect in 3D</span>
              </div>
              <div class="rounded-xl border border-white/10 bg-[#141922] overflow-x-auto">
                <table class="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr class="border-b border-white/10 text-xs text-slate-400">
                      <th class="py-3 px-4 font-medium">Space</th>
                      <th class="py-3 px-3 font-medium">Level</th>
                      <th class="py-3 px-3 font-medium text-right">Dimensions</th>
                      <th class="py-3 px-4 font-medium text-right">Area</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-white/8">
                    ${ALL_FLOOR_SPACES.map((space) => {
                      const matchingRoom = ROOMS.find((r) => r.name === space.name || r.name.includes(space.name.split(' ')[0]));
                      return `
                        <tr class="hover:bg-white/4 transition-colors">
                          <td class="py-3 px-4 text-slate-100 font-medium">
                            ${
                              matchingRoom
                                ? `<button type="button" data-specs-room="${matchingRoom.slug}" class="text-left hover:text-amber-300 underline decoration-white/25 underline-offset-4">${space.name}</button>`
                                : space.name
                            }
                          </td>
                          <td class="py-3 px-3 text-slate-400 text-xs">${space.floor}</td>
                          <td class="py-3 px-3 text-right font-mono-tabular text-slate-300 text-xs">${formatDimension(space.widthFt, space.lengthFt, this.unitSystem)}</td>
                          <td class="py-3 px-4 text-right font-mono-tabular text-white font-medium text-xs">${formatArea(space.areaSqFt, this.unitSystem)}</td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>

              <!-- Key Architectural Highlights -->
              <div class="mt-8">
                <h3 class="font-display text-base font-semibold text-white mb-3">Architectural & Engineering Highlights</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-300">
                  <div class="p-4 rounded-xl border border-white/10 bg-[#141922]">
                    <div class="font-medium text-white">Envelope & Energy</div>
                    <p class="text-xs text-slate-400 mt-1 leading-relaxed">
                      ${PROPERTY_OVERVIEW.energyRating} with triple-pane low-E motorized pocket sliders, radiant floor heating, and dual EV chargers.
                    </p>
                  </div>
                  <div class="p-4 rounded-xl border border-white/10 bg-[#141922]">
                    <div class="font-medium text-white">Finishes & Millwork</div>
                    <p class="text-xs text-slate-400 mt-1 leading-relaxed">
                      Honed travertine terraces, wide-plank European white oak floors, book-matched Carrara marble island, and western red cedar soffits.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right 5 cols: Interactive Buyer Mortgage Estimator & Viewing Form -->
            <div class="lg:col-span-5 flex flex-col gap-6">
              <div class="p-5 rounded-xl border border-white/10 bg-[#141922]">
                <h2 class="font-display text-lg font-semibold text-white">Monthly Payment Estimator</h2>
                <div class="mt-4 pb-4 border-b border-white/10 flex items-baseline justify-between">
                  <span class="text-xs text-slate-400">Estimated Monthly Total</span>
                  <span id="mortgage-total-val" class="font-mono-tabular text-2xl font-semibold text-amber-300">${formatCurrency(mortgage.totalMonthly)}/mo</span>
                </div>
                <div class="grid grid-cols-3 gap-2 py-3 text-xs border-b border-white/10">
                  <div>
                    <div class="text-slate-400">Principal & Int.</div>
                    <div id="mortgage-pi-val" class="font-mono-tabular text-slate-100 font-medium mt-0.5">${formatCurrency(mortgage.monthlyPI)}</div>
                  </div>
                  <div>
                    <div class="text-slate-400">Property Tax</div>
                    <div class="font-mono-tabular text-slate-100 font-medium mt-0.5">${formatCurrency(mortgage.monthlyTax)}</div>
                  </div>
                  <div>
                    <div class="text-slate-400">HOA Dues</div>
                    <div class="font-mono-tabular text-slate-100 font-medium mt-0.5">${formatCurrency(PROPERTY_OVERVIEW.monthlyHoa)}</div>
                  </div>
                </div>

                <div class="space-y-4 mt-4">
                  <div>
                    <div class="flex justify-between text-xs mb-1.5">
                      <label for="calc-down" class="text-slate-300">Down Payment</label>
                      <span id="calc-down-label" class="font-mono-tabular text-white">${this.downPaymentPct}% (${formatCurrency((PROPERTY_OVERVIEW.price * this.downPaymentPct) / 100)})</span>
                    </div>
                    <input id="calc-down" type="range" min="10" max="50" step="5" value="${this.downPaymentPct}" class="studio-slider w-full" />
                  </div>

                  <div>
                    <div class="flex justify-between text-xs mb-1.5">
                      <label for="calc-rate" class="text-slate-300">Interest Rate (APR)</label>
                      <span id="calc-rate-label" class="font-mono-tabular text-white">${this.interestRate.toFixed(2)}%</span>
                    </div>
                    <input id="calc-rate" type="range" min="4.0" max="8.5" step="0.125" value="${this.interestRate}" class="studio-slider w-full" />
                  </div>

                  <div class="flex items-center justify-between pt-1">
                    <span class="text-xs text-slate-300">Loan Term</span>
                    <div class="flex items-center gap-1 p-1 rounded-lg bg-white/6">
                      <button type="button" data-term="15" class="px-3 py-1.5 min-h-[34px] rounded-md text-xs font-medium ${this.loanTermYears === 15 ? 'bg-slate-100 text-slate-950' : 'text-slate-300'}">15 Years</button>
                      <button type="button" data-term="30" class="px-3 py-1.5 min-h-[34px] rounded-md text-xs font-medium ${this.loanTermYears === 30 ? 'bg-slate-100 text-slate-950' : 'text-slate-300'}">30 Years</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Request Private Tour Form -->
              <div class="p-5 rounded-xl border border-white/10 bg-[#141922]">
                <h3 class="font-display text-base font-semibold text-white">Schedule a Private Viewing</h3>
                ${
                  this.viewingRequested
                    ? `
                  <div class="mt-3 p-4 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-sm text-emerald-200">
                    Your viewing request has been recorded. Our listing advisor will confirm your preferred appointment window shortly.
                  </div>
                  <button type="button" id="btn-reset-viewing" class="mt-3 text-xs text-amber-300 hover:underline">Submit another request</button>
                `
                    : `
                  <form id="viewing-form" class="mt-3 space-y-3">
                    <div>
                      <label for="buyer-name" class="block text-xs text-slate-400 mb-1">Full Name</label>
                      <input id="buyer-name" required type="text" placeholder="Jordan Ellis" class="w-full px-3 py-2.5 min-h-[42px] rounded-lg bg-[#0e1116] border border-white/15 text-sm text-white placeholder:text-slate-500" />
                    </div>
                    <div>
                      <label for="buyer-email" class="block text-xs text-slate-400 mb-1">Email or Phone</label>
                      <input id="buyer-email" required type="text" placeholder="jordan@example.com" class="w-full px-3 py-2.5 min-h-[42px] rounded-lg bg-[#0e1116] border border-white/15 text-sm text-white placeholder:text-slate-500" />
                    </div>
                    <button type="submit" class="w-full py-2.5 px-4 min-h-[44px] rounded-lg bg-amber-600 hover:bg-amber-500 text-sm font-medium text-white transition-colors">
                      Request Private Tour
                    </button>
                  </form>
                `
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Wire Specs interactions
    this.specsOverlayEl.querySelector('#btn-specs-back')?.addEventListener('click', () => {
      this.navigate('/');
    });
    this.specsOverlayEl.querySelector('#btn-specs-units')?.addEventListener('click', () => {
      this.unitSystem = this.unitSystem === 'imperial' ? 'metric' : 'imperial';
      this.renderSpecsOverlay();
      this.renderPropertySummary();
    });
    this.specsOverlayEl.querySelectorAll<HTMLButtonElement>('[data-specs-room]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const slug = btn.dataset.specsRoom;
        if (slug) this.navigate(`/rooms/${slug}`);
      });
    });

    const updateMortgageDisplay = () => {
      const res = this.calculateMortgage();
      const totalEl = this.specsOverlayEl.querySelector('#mortgage-total-val');
      const piEl = this.specsOverlayEl.querySelector('#mortgage-pi-val');
      const downLbl = this.specsOverlayEl.querySelector('#calc-down-label');
      const rateLbl = this.specsOverlayEl.querySelector('#calc-rate-label');
      if (totalEl) totalEl.textContent = `${formatCurrency(res.totalMonthly)}/mo`;
      if (piEl) piEl.textContent = formatCurrency(res.monthlyPI);
      if (downLbl) {
        downLbl.textContent = `${this.downPaymentPct}% (${formatCurrency((PROPERTY_OVERVIEW.price * this.downPaymentPct) / 100)})`;
      }
      if (rateLbl) rateLbl.textContent = `${this.interestRate.toFixed(2)}%`;
    };

    const downInput = this.specsOverlayEl.querySelector('#calc-down') as HTMLInputElement | null;
    downInput?.addEventListener('input', () => {
      this.downPaymentPct = parseInt(downInput.value, 10);
      updateMortgageDisplay();
    });

    const rateInput = this.specsOverlayEl.querySelector('#calc-rate') as HTMLInputElement | null;
    rateInput?.addEventListener('input', () => {
      this.interestRate = parseFloat(rateInput.value);
      updateMortgageDisplay();
    });

    this.specsOverlayEl.querySelectorAll<HTMLButtonElement>('[data-term]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.loanTermYears = parseInt(btn.dataset.term || '30', 10);
        this.renderSpecsOverlay();
      });
    });

    const form = this.specsOverlayEl.querySelector('#viewing-form') as HTMLFormElement | null;
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.viewingRequested = true;
      this.renderSpecsOverlay();
      this.showToast('Private viewing request saved');
    });

    this.specsOverlayEl.querySelector('#btn-reset-viewing')?.addEventListener('click', () => {
      this.viewingRequested = false;
      this.renderSpecsOverlay();
    });
  }

  private renderShareModal(): void {
    if (!this.shareModalOpen) {
      this.shareModalEl.classList.add('hidden');
      this.shareModalEl.innerHTML = '';
      return;
    }

    const origin = window.location.origin;
    const currentUrl = `${origin}${this.route.path}`;

    this.shareModalEl.classList.remove('hidden');
    this.shareModalEl.innerHTML = `
      <div id="share-backdrop" class="fixed inset-0 bg-black/70 flex items-center justify-center p-4">
        <div role="dialog" aria-modal="true" aria-label="Share 3D Property Link" class="w-full max-w-lg rounded-xl bg-[#141922] border border-white/15 p-5 sm:p-6 shadow-2xl max-h-[88dvh] overflow-y-auto thin-scroll">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="font-display text-lg font-semibold text-white">Send 3D Tour to Buyer</h2>
              <p class="text-xs text-slate-400 mt-1">
                Share a direct link that opens this exact view on mobile, desktop, or XR headset.
              </p>
            </div>
            <button type="button" id="btn-close-share" aria-label="Close share dialog" class="w-9 h-9 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="mt-4 flex items-center gap-2">
            <input
              type="text"
              readonly
              value="${currentUrl}"
              aria-label="Current shareable URL"
              class="flex-1 min-w-0 px-3 py-2.5 min-h-[42px] rounded-lg bg-[#0e1116] border border-white/15 font-mono-tabular text-xs text-slate-200"
            />
            <button
              type="button"
              data-copy-url="${currentUrl}"
              class="px-4 py-2.5 min-h-[42px] rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-medium text-white whitespace-nowrap shrink-0"
            >Copy Current</button>
          </div>

          <div class="mt-5 pt-4 border-t border-white/10">
            <div class="text-xs font-medium text-slate-300 mb-2.5">Direct Buyer View Links</div>
            <div class="space-y-1.5">
              ${ALL_SITE_ROUTES.map(
                (r) => `
                <div class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/4 hover:bg-white/8 transition-colors">
                  <div class="min-w-0">
                    <div class="text-xs font-medium text-white truncate">${r.label}</div>
                    <div class="text-[11px] text-slate-400 font-mono-tabular truncate">${r.path}</div>
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <button type="button" data-open-route="${r.path}" class="px-2.5 py-1.5 min-h-[34px] rounded-md bg-white/8 hover:bg-white/15 text-xs text-slate-200">Open</button>
                    <button type="button" data-copy-url="${origin}${r.path}" class="px-2.5 py-1.5 min-h-[34px] rounded-md border border-white/15 hover:border-amber-500/60 text-xs text-amber-300">Copy</button>
                  </div>
                </div>
              `
              ).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    this.shareModalEl.querySelector('#share-backdrop')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.shareModalOpen = false;
        this.renderShareModal();
        this.engine.requestRender();
      }
    });

    this.shareModalEl.querySelector('#btn-close-share')?.addEventListener('click', () => {
      this.shareModalOpen = false;
      this.renderShareModal();
      this.engine.requestRender();
    });

    this.shareModalEl.querySelectorAll<HTMLButtonElement>('[data-copy-url]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const url = btn.dataset.copyUrl || currentUrl;
        void this.copyText(url);
      });
    });

    this.shareModalEl.querySelectorAll<HTMLButtonElement>('[data-open-route]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = btn.dataset.openRoute || '/';
        this.shareModalOpen = false;
        this.renderShareModal();
        this.navigate(p);
      });
    });
  }

  private renderWebGLFallback(): void {
    if (!this.webglLost) {
      this.webglFallbackEl.classList.add('hidden');
      this.webglFallbackEl.classList.remove('flex');
      return;
    }
    this.webglFallbackEl.classList.remove('hidden');
    this.webglFallbackEl.classList.add('flex');
    this.webglFallbackEl.innerHTML = `
      <div class="max-w-md rounded-xl border border-white/15 bg-[#141922] p-6">
        <h2 class="font-display text-lg font-semibold text-white">3D Graphics Context Paused</h2>
        <p class="text-sm text-slate-300 mt-2">
          Your device temporarily suspended WebGL rendering. Reload the view or open the Property Specs sheet to review full dimensions.
        </p>
        <div class="mt-4 flex justify-center gap-3">
          <button type="button" id="btn-fallback-specs" class="px-4 py-2 rounded-lg bg-white/10 text-sm text-white">View Specs</button>
          <button type="button" id="btn-fallback-reload" class="px-4 py-2 rounded-lg bg-amber-600 text-sm text-white">Reload 3D</button>
        </div>
      </div>
    `;
    this.webglFallbackEl.querySelector('#btn-fallback-specs')?.addEventListener('click', () => {
      this.webglLost = false;
      this.renderWebGLFallback();
      this.navigate('/specs');
    });
    this.webglFallbackEl.querySelector('#btn-fallback-reload')?.addEventListener('click', () => {
      window.location.reload();
    });
  }

  private calculateMortgage(): { monthlyPI: number; monthlyTax: number; totalMonthly: number } {
    const principal = PROPERTY_OVERVIEW.price * (1 - this.downPaymentPct / 100);
    const monthlyRate = this.interestRate / 100 / 12;
    const n = this.loanTermYears * 12;
    const monthlyPI =
      monthlyRate === 0
        ? principal / n
        : (principal * (monthlyRate * Math.pow(1 + monthlyRate, n))) /
          (Math.pow(1 + monthlyRate, n) - 1);
    const monthlyTax = PROPERTY_OVERVIEW.annualTax / 12;
    return {
      monthlyPI: Math.round(monthlyPI),
      monthlyTax: Math.round(monthlyTax),
      totalMonthly: Math.round(monthlyPI + monthlyTax + PROPERTY_OVERVIEW.monthlyHoa),
    };
  }

  private formatClock(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60) % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  }

  private getSunPhaseLabel(hours: number): string {
    if (hours < 10.5) return 'East · Morning Light';
    if (hours < 15.5) return 'South · Midday Sun';
    if (hours < 18.7) return 'West · Golden Hour';
    return 'Evening · Interior Glow';
  }

  private async copyText(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('Buyer link copied to clipboard');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      this.showToast('Buyer link copied');
    }
  }

  private showToast(message: string): void {
    window.clearTimeout(this.toastTimer);
    this.toastEl.textContent = message;
    this.toastEl.classList.remove('opacity-0');
    this.toastEl.classList.add('opacity-100');
    this.toastTimer = window.setTimeout(() => {
      this.toastEl.classList.remove('opacity-100');
      this.toastEl.classList.add('opacity-0');
    }, 2200);
  }

  public dispose(): void {
    window.clearTimeout(this.toastTimer);
    window.removeEventListener('popstate', this.handlePopState);
    window.removeEventListener('hashchange', this.handlePopState);
    window.removeEventListener('keydown', this.handleKeyDown);
    this.engine.dispose();
  }
}
