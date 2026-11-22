/* Trimurti Clinic – shared demo store + UI helpers (localStorage, no backend) */
(function (w) {
  const KEY = 'tc_state_v1', ME = 'tc_me_v1';
  let mem = {};
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return mem[k] || null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } };
  const iso = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const pad = (n, l = 3) => String(n).padStart(l, '0');

  function seed() {
    const d = iso(), c = d.slice(2).replace(/-/g, '');
    const mk = (n, name, phone, age, reason, mode, status, token) => ({ id: 'TC-' + c + '-' + pad(n), name, phone, age, reason, mode, status, token, priority: false });
    return {
      date: d, nextSeq: 6, nextToken: 4,
      clinic: { open: true, start: '09:00', capacity: 30, online: 15, avg: 10 },
      appts: [
        mk(1, 'Ramesh Kulkarni', '98220 11001', 54, 'Fever & cold', 'online', 'in', 1),
        mk(2, 'Sunita Patil', '98220 11002', 38, 'Back pain', 'online', 'arrived', 2),
        mk(3, 'Aarav Deshmukh', '98220 11003', 6, 'Vaccination', 'online', 'booked', null),
        mk(4, 'Meera Joshi', '98220 11004', 67, 'BP check-up', 'online', 'booked', null),
        mk(5, 'Vijay More', '98220 11005', 45, 'Cough (walk-in)', 'walkin', 'arrived', 3)
      ]
    };
  }
  function load() {
    let s = null; try { s = JSON.parse(get(KEY)); } catch (e) {}
    if (!s || s.date !== iso()) { s = seed(); set(KEY, JSON.stringify(s)); set(ME, s.appts[2].id); }
    return s;
  }
  const subs = [];
  function save(s) { set(KEY, JSON.stringify(s)); subs.forEach(f => f()); }
  function mutate(fn) { const s = load(); const r = fn(s); save(s); return r; }

  const live = s => s.appts.filter(a => a.status !== 'cancelled');
  const queue = s => s.appts.filter(a => a.status === 'arrived')
    .sort((a, b) => (b.priority - a.priority) || (a.token - b.token));
  const current = s => s.appts.find(a => a.status === 'in');
  const onlineUsed = s => live(s).filter(a => a.mode === 'online').length;
  const stats = s => {
    const l = live(s);
    return { total: l.length, online: onlineUsed(s), booked: l.filter(a => a.status === 'booked').length,
      waiting: l.filter(a => a.status === 'arrived').length, done: l.filter(a => a.status === 'done').length };
  };
  const find = (s, id) => s.appts.find(a => a.id === id);

  const API = {
    load, save, mutate, queue, current, stats, find, live,
    me: () => get(ME), setMe: id => set(ME, id),
    onChange(cb) {
      const f = () => { const e = document.activeElement; if (e && /INPUT|SELECT/.test(e.tagName)) return; cb(); };
      subs.push(cb); w.addEventListener('storage', f);
    },
    reset() { try { localStorage.removeItem(KEY); localStorage.removeItem(ME); } catch (e) { mem = {}; } load(); subs.forEach(f => f()); },
    book(d) {
      return mutate(s => {
        if (!s.clinic.open) return { err: 'The doctor has not opened today’s clinic yet. Please try again later.' };
        if (onlineUsed(s) >= s.clinic.online) return { err: 'Online appointments for today are full. Please walk in or try tomorrow.' };
        if (live(s).length >= s.clinic.capacity) return { err: 'Clinic is at full capacity for today.' };
        const id = 'TC-' + s.date.slice(2).replace(/-/g, '') + '-' + pad(s.nextSeq++);
        const a = Object.assign({ id, mode: 'online', status: 'booked', token: null, priority: false }, d);
        s.appts.push(a); set(ME, id); return { ok: a };
      });
    },
    addWalkin(d) {
      return mutate(s => {
        if (live(s).length >= s.clinic.capacity) return { err: 'Clinic is at full capacity for today.' };
        const id = 'TC-' + s.date.slice(2).replace(/-/g, '') + '-' + pad(s.nextSeq++);
        const a = Object.assign({ id, mode: 'walkin', status: 'arrived', token: s.nextToken++, priority: false }, d);
        s.appts.push(a); return { ok: a };
      });
    },
    checkIn: id => mutate(s => { const a = find(s, id); if (a && a.status === 'booked') { a.status = 'arrived'; a.token = s.nextToken++; return a; } }),
    togglePriority: id => mutate(s => { const a = find(s, id); if (a && (a.status === 'booked' || a.status === 'arrived')) a.priority = !a.priority; }),
    cancel: id => mutate(s => { const a = find(s, id); if (a && a.status !== 'done') a.status = 'cancelled'; }),
    callNext: () => mutate(s => { const c = current(s); if (c) c.status = 'done'; const q = queue(s); if (q.length) q[0].status = 'in'; }),
    saveClinic: c => mutate(s => { Object.assign(s.clinic, c); })
  };

  /* ---------- UI helpers ---------- */
  const P = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    ticket: '<path d="M3 9a2 2 0 0 0 0 6v3h18v-3a2 2 0 0 0 0-6V6H3z"/><path d="M13 6v12" stroke-dasharray="2 2"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    settings: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2.2.7 3.5 2.6 3.5 5.5"/>',
    logout: '<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    check: '<path d="M5 12l5 5 9-10"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    heart: '<path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>', cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'
  };
  const icon = (n, sz = 22) => `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${P[n]}</svg>`;
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmtTime = t => { const [h, m] = t.split(':').map(Number); return ((h % 12) || 12) + ':' + pad(m, 2) + ' ' + (h < 12 ? 'AM' : 'PM'); };
  const fmtDate = () => new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
  const TABS = {
    patient: [['patient-home.html', 'home', 'Home'], ['patient-book.html', 'plus', 'Book'], ['patient-status.html', 'ticket', 'My Token']],
    reception: [['reception.html', 'list', 'Appointments'], ['welcome.html', 'logout', 'Switch role']],
    doctor: [['doctor-setup.html', 'settings', 'Day Setup'], ['doctor-queue.html', 'users', 'Queue'], ['welcome.html', 'logout', 'Switch role']]
  };
  function shell(role, active, header, body, extra) {
    const tabs = role ? `<nav class="tabbar">${TABS[role].map(t => `<a class="tab ${t[0] === active ? 'on' : ''}" href="${t[0]}">${icon(t[1])}${t[2]}</a>`).join('')}</nav>` : '';
    return `<div class="sb"><span>9:41</span><span>●●● &nbsp;100%</span></div>${header}<main class="scroll">${body}</main>${tabs}${extra || ''}`;
  }
  function toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    document.querySelector('.app').appendChild(t); setTimeout(() => t.remove(), 1800);
  }
  function prioritySheet(done) {
    const bg = document.createElement('div'); bg.className = 'sheet-bg';
    bg.innerHTML = `<div class="sheet"><h3>★ Add priority patient</h3><p style="color:var(--mut);font-size:12.5px;margin:-8px 0 12px">Goes to the front of the queue and gets the next token.</p><div class="banner err" id="pe" style="display:none"></div>
      <div class="field"><label>Name</label><input id="pn" placeholder="Patient name"></div><div class="field"><label>Mobile (optional)</label><input id="pp" inputmode="tel"></div>
      <div class="field"><label>Reason</label><input id="pr" value="Priority visit"></div><button class="btn" id="ps">Add as first patient</button></div>`;
    document.querySelector('.app').appendChild(bg);
    bg.onclick = e => { if (e.target === bg) bg.remove(); };
    bg.querySelector('#ps').onclick = () => {
      const n = bg.querySelector('#pn').value.trim(), pe = bg.querySelector('#pe');
      if (!n) { pe.style.display = 'flex'; pe.textContent = 'Enter the patient name.'; return; }
      const r = API.addWalkin({ name: n, phone: bg.querySelector('#pp').value, age: '', reason: bg.querySelector('#pr').value || 'Priority visit', priority: true });
      if (r.err) { pe.style.display = 'flex'; pe.textContent = r.err; return; }
      bg.remove(); done(r.ok);
    };
  }
  if (w.top !== w) document.documentElement.classList.add('framed');
  w.TC = Object.assign(API, { icon, esc, fmtTime, fmtDate, shell, toast, prioritySheet });
})(window);
