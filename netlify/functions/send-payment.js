exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { email, prenom, plan, montant } = JSON.parse(event.body);
    const nom = prenom || email.split('@')[0];
    const isPro = plan === 'pro';
    const credits = isPro ? 'illimitées' : '5 CV + 5 lettres de motivation';
    const planLabel = isPro ? 'Pro — 14,90€/mois' : 'Boost — 2,99€';

    const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Paiement confirmé — CVBoost</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Inter',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

<!-- HEADER -->
<tr><td style="background:#0e0e10;padding:32px 40px;text-align:center">
<div style="font-family:'Inter',Arial,sans-serif;font-size:24px;font-weight:900;letter-spacing:-1px;color:#ffffff">CV<span style="color:#5B4FE8">Boost</span></div>
<div style="margin-top:8px;font-size:12px;color:#555;letter-spacing:1px;text-transform:uppercase">Confirmation de paiement</div>
</td></tr>

<!-- SUCCESS BANNER -->
<tr><td style="background:#0f1e14;padding:24px 40px;text-align:center;border-bottom:1px solid #1a3d24">
<div style="font-size:36px;margin-bottom:8px">✅</div>
<div style="font-size:18px;font-weight:800;color:#2ecc9a;letter-spacing:-.5px">Paiement confirmé !</div>
<div style="font-size:13px;color:#555;margin-top:4px">${montant || planLabel}</div>
</td></tr>

<!-- BODY -->
<tr><td style="padding:40px">
<h1 style="font-size:22px;font-weight:800;color:#111;letter-spacing:-.5px;margin:0 0 16px">Merci ${nom}, ton accès est activé 🎉</h1>
<p style="font-size:15px;color:#666;line-height:1.7;margin:0 0 24px">Ton plan <strong>${planLabel}</strong> est maintenant actif. Tu peux commencer à optimiser tes CV dès maintenant.</p>

<div style="background:#f8f8ff;border:1px solid #e8e6ff;border-radius:12px;padding:24px;margin:0 0 28px">
<div style="font-size:13px;font-weight:700;color:#5B4FE8;letter-spacing:.5px;text-transform:uppercase;margin-bottom:16px">✦ Ce qui est inclus dans ton plan</div>
<div style="display:flex;align-items:flex-start;margin-bottom:12px">
<span style="color:#5B4FE8;font-weight:700;margin-right:10px">✓</span>
<span style="font-size:14px;color:#444;line-height:1.6"><strong>Optimisations :</strong> ${credits}</span>
</div>
<div style="display:flex;align-items:flex-start;margin-bottom:12px">
<span style="color:#5B4FE8;font-weight:700;margin-right:10px">✓</span>
<span style="font-size:14px;color:#444;line-height:1.6"><strong>Score ATS</strong> sur 23 critères pour chaque CV</span>
</div>
<div style="display:flex;align-items:flex-start;margin-bottom:12px">
<span style="color:#5B4FE8;font-weight:700;margin-right:10px">✓</span>
<span style="font-size:14px;color:#444;line-height:1.6"><strong>Mots-clés ATS</strong> ciblés par offre d'emploi</span>
</div>
${isPro ? `<div style="display:flex;align-items:flex-start">
<span style="color:#5B4FE8;font-weight:700;margin-right:10px">✓</span>
<span style="font-size:14px;color:#444;line-height:1.6"><strong>Lettres de motivation IA</strong> illimitées</span>
</div>` : ''}
</div>

<div style="text-align:center;margin:0 0 28px">
<a href="https://mon-cvboost.netlify.app" style="display:inline-block;background:#5B4FE8;color:#ffffff;padding:14px 36px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:-.3px">Optimiser mon CV maintenant →</a>
</div>

<div style="background:#fff9f0;border:1px solid #ffe8c0;border-radius:12px;padding:20px;margin:0 0 28px">
<div style="font-size:13px;font-weight:700;color:#f5a623;margin-bottom:8px">💡 Pour des résultats optimaux</div>
<p style="font-size:14px;color:#666;line-height:1.7;margin:0">Crée <strong>une version différente</strong> de ton CV pour chaque candidature. Colle l'offre complète pour que l'IA cible exactement les mots-clés du recruteur.</p>
</div>

<p style="font-size:14px;color:#888;line-height:1.7;margin:0">Un problème avec ton accès ? Écris-nous à <a href="mailto:cvboost.fr@gmail.com" style="color:#5B4FE8;text-decoration:none">cvboost.fr@gmail.com</a>. On répond sous 24h.</p>
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
        subject: `✅ Paiement confirmé — Ton plan ${planLabel} est actif !`,
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
