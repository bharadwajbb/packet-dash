// Canvas platformer. It only reports "Pak entered zone X"; it never decides correctness.
import { VIEW_W, VIEW_H } from './world.js';

const C = {
  bg: '#060c18', grid: 'rgba(90,150,255,0.07)', rack: '#0c1526', rackEdge: '#1c2a44',
  tray: '#172236', trayTop: '#2fd3ff', ok: '#3ddc84', okDim: '#0f2b22', bad: '#ff5c6c', warn: '#ffb020',
  text: '#d7e3f4', dim: '#7f93b0', pak: '#2fd3ff', pakHead: '#0a4f66', copper: '#d08a4a', copperDark: '#3d2414', fibre: '#2fd3ff', fibreDark: '#0b2735',
};
const PW = 36, PH = 28;
const SPEED = 250, GRAVITY = 1900, JUMP = 730, STEP = 1 / 60;

export class Game {
  constructor(canvas, { onEnter, onFall, reducedMotion }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onEnter = onEnter;
    this.onFall = onFall;
    this.reducedMotion = reducedMotion;
    this.keys = new Set();
    this.selection = new Set();
    this.solved = false;
    this.flash = null;
    this.running = false;
    this.time = 0;
    this.fit();
    this.onKeyDown = (e) => this.keyDown(e);
    this.onKeyUp = (e) => this.keys.delete(e.code);
    this.onBlur = () => this.keys.clear();
    canvas.addEventListener('keydown', this.onKeyDown);
    canvas.addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('blur', this.onBlur);
  }

  fit() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = VIEW_W * dpr;
    this.canvas.height = VIEW_H * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  load(round, world) {
    this.round = round;
    this.world = world;
    this.solved = false;
    this.selection = new Set();
    this.reachedDecision = false;
    this.place(world.spawn.x);
    this.camX = 0;
  }

  place(x) {
    this.p = { x, y: this.world.groundY - PH, vx: 0, vy: 0, grounded: true, face: 1, hidden: false };
    this.enterCooldown = 0.25;
  }

  respawnAtDecision(message) {
    this.place(this.world.decisionX);
    this.showFlash(message ?? '↩ bounced back to the decision point', C.bad);
  }

  setSelection(sel) { this.selection = new Set(sel); }
  setSolved(zone) { this.solved = true; if (zone && zone.kind !== 'piece') this.p.hidden = true; this.showFlash('✔ DELIVERED · press N or Next', C.ok, 99); }
  showFlash(text, color, seconds = 1.8) { this.flash = { text, color, until: this.time + seconds }; }

  start() {
    if (this.running) return;
    this.running = true;
    let last = performance.now(), acc = 0;
    const frame = (now) => {
      if (!this.running) return;
      acc += Math.min(0.1, (now - last) / 1000);
      last = now;
      while (acc >= STEP) { this.update(STEP); acc -= STEP; }
      this.draw();
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  stop() { this.running = false; cancelAnimationFrame(this.raf); }

  destroy() {
    this.stop();
    this.canvas.removeEventListener('keydown', this.onKeyDown);
    this.canvas.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('blur', this.onBlur);
  }

  keyDown(e) {
    const game = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyE'];
    if (!game.includes(e.code)) return;
    e.preventDefault();
    if (e.repeat && (e.code === 'KeyE' || e.code === 'ArrowUp')) return;
    this.keys.add(e.code);
    if ((e.code === 'Space' || e.code === 'KeyW') && this.p.grounded && !this.solved) { this.p.vy = -JUMP; this.p.grounded = false; }
    if (e.code === 'ArrowUp' || e.code === 'KeyE') this.tryEnter();
  }

  zoneAtPlayer() {
    const cx = this.p.x + PW / 2;
    return this.world.zones.find((z) => cx >= z.x && cx <= z.x + z.w);
  }

  tryEnter() {
    if (this.solved || !this.p.grounded || this.enterCooldown > 0) return;
    const z = this.zoneAtPlayer();
    if (!z) { this.showFlash('Nothing to enter here: walk to a door, path or terminal', C.dim, 1.2); return; }
    this.enterCooldown = 0.25;
    this.onEnter(z);
  }

  supportAt(x, prevBottom, nextBottom) {
    const cx = x + PW / 2;
    const surfaces = [
      ...this.world.platforms.map((pl) => ({ x: pl.x, w: pl.w, y: pl.y })),
      ...this.world.ground.map((g) => ({ x: g.x, w: g.w, y: this.world.groundY })),
    ];
    for (const s of surfaces) {
      if (cx >= s.x && cx <= s.x + s.w && prevBottom <= s.y + 0.5 && nextBottom >= s.y) return s.y;
    }
    return null;
  }

  update(dt) {
    this.time += dt;
    this.enterCooldown = Math.max(0, this.enterCooldown - dt);
    const p = this.p;
    if (this.solved) return;
    const dir = (this.keys.has('ArrowRight') || this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('ArrowLeft') || this.keys.has('KeyA') ? 1 : 0);
    p.vx = dir * SPEED;
    if (dir) p.face = dir;
    p.x = Math.max(0, Math.min(this.world.width - PW, p.x + p.vx * dt));
    p.vy += GRAVITY * dt;
    const prevBottom = p.y + PH;
    const nextBottom = prevBottom + p.vy * dt;
    const support = p.vy >= 0 ? this.supportAt(p.x, prevBottom, nextBottom) : null;
    if (support !== null) { p.y = support - PH; p.vy = 0; p.grounded = true; }
    else { p.y += p.vy * dt; p.grounded = false; }
    if (p.x >= this.world.decisionX) this.reachedDecision = true;
    if (p.y > VIEW_H + 40) {
      this.place(this.reachedDecision ? this.world.decisionX : this.world.spawn.x);
      this.showFlash('✕ LINK DOWN · fell into a dropped link, respawned (no penalty)', C.warn);
      this.onFall?.();
    }
    const target = Math.max(0, Math.min(this.world.width - VIEW_W, p.x - VIEW_W * 0.35));
    this.camX = this.reducedMotion() ? target : this.camX + (target - this.camX) * 0.15;
  }

  // ---------- drawing ----------
  draw() {
    const { ctx } = this;
    const cam = this.camX;
    const GY = this.world.groundY;
    const t = this.reducedMotion() ? 0 : this.time;

    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // grid
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    const off = -(cam * 0.4) % 40;
    for (let x = off; x < VIEW_W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VIEW_H); ctx.stroke(); }
    for (let y = 0; y < VIEW_H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VIEW_W, y); ctx.stroke(); }
    // background racks with LEDs
    const pc = cam * 0.6;
    for (let i = Math.floor(pc / 260) - 1; i < (pc + VIEW_W) / 260 + 1; i++) {
      const x = i * 260 - pc + 40;
      ctx.fillStyle = C.rack; ctx.fillRect(x, 90, 70, GY - 90);
      ctx.strokeStyle = C.rackEdge; ctx.strokeRect(x + 0.5, 90.5, 70, GY - 90);
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 3; c++) {
          const seed = (i * 31 + r * 7 + c * 13) & 0xff;
          const on = t === 0 ? seed % 3 !== 0 : Math.sin(t * (1 + (seed % 5)) + seed) > -0.2;
          ctx.fillStyle = on ? (seed % 7 === 0 ? C.warn : C.ok) : '#13203a';
          ctx.fillRect(x + 12 + c * 18, 104 + r * 24, 6, 4);
        }
      }
    }
    // gaps
    for (const g of this.world.gaps) {
      const x = g.x - cam;
      ctx.setLineDash([6, 6]); ctx.strokeStyle = C.bad; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, GY + 2); ctx.lineTo(x + g.w, GY + 2); ctx.stroke(); ctx.setLineDash([]);
      this.text('LINK DOWN', x + g.w / 2, GY + 30, C.bad, 11, 'center');
    }
    // ground + platforms (cable trays)
    for (const g of this.world.ground) this.tray(g.x - cam, GY, g.w, VIEW_H - GY);
    for (const pl of this.world.platforms) this.tray(pl.x - cam, pl.y, pl.w, 12);
    // buildings
    for (const b of this.world.buildings) {
      const x = b.x - cam;
      ctx.fillStyle = '#0b1424'; ctx.fillRect(x, GY - 175, b.w, 175);
      ctx.strokeStyle = '#3a4d6b'; ctx.lineWidth = 2; ctx.strokeRect(x, GY - 175, b.w, 175);
      ctx.fillStyle = '#13213a'; ctx.fillRect(x, GY - 175, b.w, 30);
      this.text(`HOST ${b.ip}`, x + b.w / 2, GY - 154, C.text, 15, 'center', true);
    }
    // zones
    const here = this.zoneAtPlayer();
    for (const z of this.world.zones) this.zone(z, z.x - cam, GY, t, here === z);
    // checkpoint marker
    const dx = this.world.decisionX - cam;
    this.text('▼ DECISION POINT', dx + 10, GY - 196, C.dim, 10, 'left');
    // Pak
    if (!this.p.hidden) this.pak(this.p.x - cam, this.p.y);
    // prompt
    if (here && !this.solved && this.p.grounded) {
      const verb = here.kind === 'piece' ? (this.selection.has(here.num) ? 'unmark' : 'mark for resend') : here.kind === 'send' ? 'send' : 'enter';
      this.bubble(`▲ / E  ${verb}: ${here.kind === 'door' ? `${here.ip}:${here.label}` : here.label}`, this.p.x - cam + PW / 2, this.p.y - 16);
    }
    if (this.flash && this.time < this.flash.until) {
      ctx.fillStyle = 'rgba(6,12,24,0.85)'; ctx.fillRect(0, 10, VIEW_W, 30);
      this.text(this.flash.text, VIEW_W / 2, 31, this.flash.color, 15, 'center', true);
    }
  }

  tray(x, y, w, hgt) {
    const { ctx } = this;
    ctx.fillStyle = C.tray; ctx.fillRect(x, y, w, hgt);
    ctx.fillStyle = C.trayTop; ctx.fillRect(x, y, w, 3);
    ctx.fillStyle = '#0d1626';
    for (let i = x + 8; i < x + w - 8; i += 28) ctx.fillRect(i, y + 9, 10, 6);
  }

  zone(z, x, GY, t, active) {
    const { ctx } = this;
    const top = GY - z.h;
    if (z.kind === 'door') {
      ctx.fillStyle = z.listening ? C.okDim : '#11161f'; ctx.fillRect(x, top, z.w, z.h);
      ctx.strokeStyle = active ? C.warn : z.listening ? C.ok : '#4b5568'; ctx.lineWidth = active ? 3 : 2; ctx.strokeRect(x, top, z.w, z.h);
      this.text(z.label, x + z.w / 2, top + 36, C.text, 22, 'center', true);
      this.text(z.sub, x + z.w / 2, top + 56, C.dim, 11, 'center');
      const blink = z.listening && t ? (Math.sin(t * 4) > -0.6) : z.listening;
      ctx.fillStyle = blink ? C.ok : '#2a3242'; ctx.beginPath(); ctx.arc(x + z.w - 11, top + 11, 5, 0, Math.PI * 2); ctx.fill();
      this.text(z.listening ? 'LISTENING' : 'CLOSED', x + z.w / 2, top + z.h - 12, z.listening ? C.ok : '#8a94a6', 10, 'center', true);
    } else if (z.kind === 'bounce') {
      ctx.fillStyle = active ? '#5a3c05' : '#3a2804'; ctx.fillRect(x, GY - z.h, z.w, z.h);
      ctx.strokeStyle = C.warn; ctx.lineWidth = 2; ctx.strokeRect(x, GY - z.h, z.w, z.h);
      this.text(z.label, x + z.w / 2, GY - 52, C.warn, 14, 'center', true);
      this.text(z.sub, x + z.w / 2, GY - 34, C.dim, 11, 'center');
    } else if (z.kind === 'path') {
      const copper = z.medium === 'copper';
      ctx.fillStyle = copper ? C.copperDark : C.fibreDark; ctx.fillRect(x, top, z.w, z.h);
      ctx.strokeStyle = active ? C.warn : copper ? C.copper : C.fibre; ctx.lineWidth = active ? 3 : 2; ctx.strokeRect(x, top, z.w, z.h);
      ctx.strokeStyle = copper ? C.copper : C.fibre; ctx.lineWidth = 1;
      for (let i = 1; i <= z.lanes; i++) {
        const ly = top + (z.h / (z.lanes + 1)) * i;
        ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(x + 6, ly); ctx.lineTo(x + z.w - 6, ly); ctx.stroke(); ctx.globalAlpha = 1;
      }
      // signal dots moving through the lanes
      if (t) {
        ctx.fillStyle = copper ? '#ffd2a8' : '#c9f5ff';
        for (let i = 1; i <= z.lanes; i++) {
          const ly = top + (z.h / (z.lanes + 1)) * i;
          const px = x + 6 + (((t * 60 + i * 23) % (z.w - 12)));
          ctx.fillRect(px, ly - 1, 4, 2);
        }
      }
      this.text(z.label, x + z.w / 2, top - 30, copper ? C.copper : C.fibre, 13, 'center', true);
      this.text(z.sub, x + z.w / 2, top - 13, C.text, 12, 'center', true);
    } else if (z.kind === 'piece') {
      const sel = this.selection.has(z.num);
      ctx.fillStyle = sel ? '#4a3405' : z.held ? '#0f2318' : '#2a0f14'; ctx.fillRect(x, top, z.w, z.h);
      ctx.strokeStyle = active ? '#ffffff' : sel ? C.warn : z.held ? C.ok : C.bad; ctx.lineWidth = active || sel ? 3 : 2;
      if (!z.held && !sel) ctx.setLineDash([5, 4]);
      ctx.strokeRect(x, top, z.w, z.h); ctx.setLineDash([]);
      this.text(z.label, x + z.w / 2, top + 22, C.text, 16, 'center', true);
      this.text(z.held ? `"${z.chunk}"` : '?', x + z.w / 2, top + 44, z.held ? C.ok : C.bad, 14, 'center', true);
      this.text(sel ? '↻ RESEND' : z.held ? 'ON BOARD' : 'MISSING', x + z.w / 2, top + z.h - 10, sel ? C.warn : z.held ? C.ok : C.bad, 9, 'center', true);
    } else if (z.kind === 'send') {
      ctx.fillStyle = '#9aa7bd'; ctx.fillRect(x + 6, top, 4, z.h);
      ctx.fillStyle = active ? '#ffd166' : C.warn;
      ctx.beginPath(); ctx.moveTo(x + 10, top); ctx.lineTo(x + z.w + 12, top + 18); ctx.lineTo(x + 10, top + 36); ctx.fill();
      this.text('SEND', x + 30, top + 23, '#1a1200', 12, 'center', true);
      this.text(`${this.selection.size} marked`, x + z.w / 2, top - 10, C.text, 11, 'center', true);
    }
  }

  pak(x, y) {
    const { ctx } = this;
    ctx.fillStyle = C.pak; this.round_(x, y, PW, PH, 6); ctx.fill();
    ctx.fillStyle = C.pakHead; ctx.fillRect(x + 3, y + 2, PW - 6, 8);
    ctx.strokeStyle = '#0a3a4c'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + 4, y + 12); ctx.lineTo(x + PW / 2, y + 21); ctx.lineTo(x + PW - 4, y + 12); ctx.stroke();
    const ex = this.p.face > 0 ? 6 : -6;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(x + PW / 2 - 6 + ex, y + 15, 3, 0, Math.PI * 2); ctx.arc(x + PW / 2 + 6 + ex, y + 15, 3, 0, Math.PI * 2); ctx.fill();
    const hd = this.round.header;
    const tag = this.round.mechanic === 'door' ? `:${hd.port}` : this.round.mechanic === 'path' ? `${hd.sizeKB}KB` : 'SEQ';
    this.text(tag, x + PW / 2, y + 9, '#c9f5ff', 7, 'center', true);
  }

  round_(x, y, w, hgt, r) {
    const { ctx } = this;
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + hgt, r); ctx.arcTo(x + w, y + hgt, x, y + hgt, r);
    ctx.arcTo(x, y + hgt, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  bubble(text, cx, y) {
    const { ctx } = this;
    ctx.font = 'bold 12px ui-monospace, SFMono-Regular, Menlo, monospace';
    const w = ctx.measureText(text).width + 16;
    const x = Math.max(4, Math.min(VIEW_W - w - 4, cx - w / 2));
    ctx.fillStyle = 'rgba(6,12,24,0.92)'; ctx.fillRect(x, y - 20, w, 22);
    ctx.strokeStyle = C.warn; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y - 19.5, w - 1, 21);
    this.text(text, x + w / 2, y - 5, C.warn, 12, 'center', true);
  }

  text(str, x, y, color, size, align = 'left', bold = false) {
    const { ctx } = this;
    ctx.font = `${bold ? 'bold ' : ''}${size}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(str, x, y);
  }
}
