<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>VAATIA NEXUS — School Operating System | Vaatia College Makurdi</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="css/styles.css" />
</head>
<body>
  <section id="loginScreen">
    <div class="hero">
      <div>
        <div class="crest"><img src="vcm-logo.png" alt="Vaatia College Makurdi official logo" onerror="this.src='https://vaatiacollege.com.ng/Media%20Content/vcm-logo.png'" /></div>
        <div class="motto">Knowledge &amp; Service</div>
        <h1>VAATIA <em>NEXUS</em></h1>
        <p>Vaatia College Makurdi. This portal is secured by an administrator-assigned account and role-based permissions.</p>
      </div>
      <p style="font-size:.78rem;color:#b7a87a">Secure school operations portal · Session 2025/2026</p>
    </div>
    <div class="login-pane">
      <div class="login-card">
        <h2>Sign in</h2>
        <p class="sub">Use the email and password assigned to your school role.</p>
        <form id="loginForm">
          <label for="email">Email</label>
          <input id="email" type="email" name="email" value="" autocomplete="username" required />
          <label for="pass">Password</label>
          <input id="pass" type="password" name="password" autocomplete="current-password" required />
          <button class="btn btn-gold" type="submit">Sign in</button>
        </form>
      </div>
    </div>
  </section>

  <section id="app">
    <aside>
      <div class="brand">
        <div class="crest"><img src="vcm-logo.png" alt="Vaatia College logo" onerror="this.src='https://vaatiacollege.com.ng/Media%20Content/vcm-logo.png'" /></div>
        <div><strong>VAATIA NEXUS</strong><small>KNOWLEDGE &amp; SERVICE</small></div>
      </div>
      <nav id="nav"></nav>
      <div class="who">
        Signed in as<br /><b id="whoName">—</b>
        <span id="whoRole">—</span>
        <button class="btn btn-sm btn-gold" style="margin-top:10px;width:auto" onclick="logout()">Sign out</button>
      </div>
    </aside>
    <div>
      <header class="top">
        <div>
          <h2 id="pageTitle">Command Centre</h2>
          <div class="meta">Vaatia College Makurdi · 2025/2026 · First Term · <span id="liveTime"></span></div>
        </div>
        <div class="bellwrap">
          <input class="searchbox" id="omni" placeholder="Find student, receipt, house…" onkeydown="if(event.key==='Enter')omniGo()" />
          <button class="btn btn-ghost btn-sm" onclick="omniGo()">Search</button>
          <button class="bell" title="Alerts" onclick="show('messages')">🔔</button>
          <span class="badge" id="nCount">5</span>
        </div>
      </header>
      <div class="content" id="view"></div>
      <div class="toast" id="toast"></div>
      <div class="modal" id="modal" onclick="if(event.target.id==='modal')closeModal()">
        <div class="sheet" id="sheet"></div>
      </div>
      <footer class="appf">VAATIA NEXUS prototype · Motto: Knowledge &amp; Service · Address: No. 8 Chia Ikima Street, Off Sen. George Akume Way, Makurdi, Benue · P.O. Box 1354</footer>
    </div>
  </section>

  <script src="js/app.js"></script>
</body>
</html>
