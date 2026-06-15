exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { email, prenom } = JSON.parse(event.body);
    const nom = prenom || email.split('@')[0];

    const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Bienvenue sur CVBoost</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Inter',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

<!-- HEADER -->
<tr><td style="background:#0e0e10;padding:32px 40px;text-align:center">
<div style="font-family:'Inter',Arial,sans-serif;font-size:24px;font-weight:900;letter-spacing:-1px;color:#ffffff">CV<span style="color:#5B4FE8">Boost</span></div>
<div style="margin-top:8px;font-size:12px;color:#555;letter-spacing:1px;text-transform:uppercase">Propulsé par l'IA</div>
</td></tr>

<!-- BODY -->
<tr><td style="padding:40px">
<h1 style="font-size:26px;font-weight:800;color:#111;letter-spacing:-1px;margin:0 0 16px">Bienvenue, ${nom} ! 🎉</h1>
<p style="font-size:15px;color:#666;line-height:1.7;margin:0 0 24px">Tu viens de rejoindre plus de <strong>12 000 étudiants</strong> qui utilisent CVBoost pour décrocher leurs stages et alternances dans les meilleures entreprises françaises.</p>

<div style="background:#f8f8ff;border:1px solid #e8e6ff;border-radius:12px;padding:24px;margin:0 0 28px">
<div style="font-size:13px;font-weight:700;color:#5B4FE8;letter-spacing:.5px;text-transform:uppercase;margin-bottom:16px">✦ Ce que tu peux faire gratuitement</div>
<div style="display:flex;align-items:flex-start;margin-bottom:12px">
<span style="color:#5B4FE8;font-weight:700;margin-right:10px">✓</span>
<span style="font-size:14px;color:#444;line-height:1.6"><strong>1 optimisation CV complète</strong> — Score ATS, mots-clés ciblés, réécriture IA</span>
</div>
<div style="display:flex;align-items:flex-start;margin-bottom:12px">
<span style="color:#5B4FE8;font-weight:700;margin-right:10px">✓</span>
<span style="font-size:14px;color:#444;line-height:1.6"><strong>1 lettre de motivation IA</strong> — Personnalisée pour chaque offre d'emploi</span>
</div>
<div style="display:flex;align-items:flex-start">
<span style="color:#5B4FE8;font-weight:700;margin-right:10px">✓</span>
<span style="font-size:14px;color:#444;line-height:1.6"><strong>20 exemples de CV</strong> — Finance, Commerce, Conseil, Tech</span>
</div>
</div>

<div style="text-align:center;margin:0 0 28px">
<a href="https://mon-cvboost.netlify.app" style="display:inline-block;background:#5B4FE8;color:#ffffff;padding:14px 36px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:-.3px">Optimiser mon CV maintenant →</a>
</div>

<div style="background:#fff9f0;border:1px solid #ffe8c0;border-radius:12px;padding:20px;margin:0 0 28px">
<div style="font-size:13px;font-weight:700;color:#f5a623;margin-bottom:8px">⚡ Conseil pour maximiser tes résultats</div>
<p style="font-size:14px;color:#666;line-height:1.7;margin:0">Colle le texte <strong>complet</strong> de l'offre d'emploi pour obtenir le meilleur ciblage ATS. Plus l'offre est détaillée, plus le score sera précis.</p>
</div>

<p style="font-size:14px;color:#888;line-height:1.7;margin:0">Des questions ? Réponds directement à cet email ou écris-nous à <a href="mailto:cvboost.fr@gmail.com" style="color:#5B4FE8;text-decoration:none">cvboost.fr@gmail.com</a>. On répond sous 24h.</p>
</td></tr>

<!-- FOOTER -->
<tr><td style="background:#f8f8f8;padding:24px 40px;text-align:center;border-top:1px solid #eee">
<p style="font-size:12px;color:#aaa;margin:0">© 2026 CVBoost — Milann Rua<br>
<a href="https://mon-cvboost.netlify.app" style="color:#aaa;text-decoration:none">mon-cvboost.netlify.app</a></p>
</td></tr>

</table>
</td></tr>
</table>
</body></html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'CVBoost <onboarding@resend.dev>',
        to: email,
        subject: `Bienvenue sur CVBoost, ${nom} ! Ton premier CV optimisé t'attend 🚀`,
        html
      })
    });

    const data = await res.json();
    if (!res.ok) return { statusCode: 500, body: JSON.stringify({ error: data.message }) };
    return { statusCode: 200, body: JSON.stringify({ success: true }) };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
