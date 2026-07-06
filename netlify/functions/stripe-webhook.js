const crypto = require('crypto');

const SUPABASE_URL = 'https://aunoabtcgtnglrhcvaax.supabase.co';

// Vérifie que le webhook vient vraiment de Stripe (sécurité)
function verifyStripeSignature(rawBody, signature, secret) {
  try {
    const parts = signature.split(',');
    const timestamp = parts.find(p => p.startsWith('t=')).split('=')[1];
    const v1 = parts.find(p => p.startsWith('v1=')).split('=')[1];
    const signed = `${timestamp}.${rawBody}`;
    const expected = crypto.createHmac('sha256', secret).update(signed, 'utf8').digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(v1, 'hex'));
  } catch {
    return false;
  }
}

async function sendPaymentEmail(email, plan) {
  const isPro = plan === 'pro';
  const prenom = email.split('@')[0];
  const planLabel = isPro ? 'Pro — 14,90€/mois' : 'Boost — 2,99€';
  const credits = isPro ? 'illimitées' : '5 CV + 5 lettres de motivation';

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Paiement confirmé — CVBoost</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Inter',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:#0e0e10;padding:32px 40px;text-align:center">
<div style="font-size:24px;font-weight:900;color:#ffffff">CV<span style="color:#5B4FE8">Boost</span></div>
<div style="margin-top:8px;font-size:12px;color:#555;letter-spacing:1px;text-transform:uppercase">Confirmation de paiement</div>
</td></tr>
<tr><td style="background:#0f1e14;padding:24px 40px;text-align:center;border-bottom:1px solid #1a3d24">
<div style="font-size:36px;margin-bottom:8px">✅</div>
<div style="font-size:18px;font-weight:800;color:#2ecc9a">Paiement confirmé !</div>
<div style="font-size:13px;color:#555;margin-top:4px">${planLabel}</div>
</td></tr>
<tr><td style="padding:40px">
<h1 style="font-size:22px;font-weight:800;color:#111;margin:0 0 16px">Merci ${prenom}, ton accès est activé 🎉</h1>
<p style="font-size:15px;color:#666;line-height:1.7;margin:0 0 24px">Ton plan <strong>${planLabel}</strong> est actif. Tu peux optimiser tes CV dès maintenant.</p>
<div style="background:#f8f8ff;border:1px solid #e8e6ff;border-radius:12px;padding:24px;margin:0 0 28px">
<div style="font-size:13px;font-weight:700;color:#5B4FE8;margin-bottom:16px">✦ Inclus dans ton plan</div>
<div style="margin-bottom:12px"><span style="color:#5B4FE8;font-weight:700;margin-right:10px">✓</span><span style="font-size:14px;color:#444"><strong>Optimisations :</strong> ${credits}</span></div>
<div style="margin-bottom:12px"><span style="color:#5B4FE8;font-weight:700;margin-right:10px">✓</span><span style="font-size:14px;color:#444"><strong>Score ATS</strong> sur 23 critères</span></div>
<div><span style="color:#5B4FE8;font-weight:700;margin-right:10px">✓</span><span style="font-size:14px;color:#444"><strong>Mots-clés ATS</strong> ciblés par offre</span></div>
</div>
<div style="text-align:center;margin:0 0 28px">
<a href="https://mon-cvboost.netlify.app" style="display:inline-block;background:#5B4FE8;color:#fff;padding:14px 36px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none">Optimiser mon CV →</a>
</div>
<p style="font-size:14px;color:#888;line-height:1.7;margin:0">Un problème ? <a href="mailto:cvboost.fr@gmail.com" style="color:#5B4FE8;text-decoration:none">cvboost.fr@gmail.com</a> — réponse sous 24h.</p>
</td></tr>
<tr><td style="background:#f8f8f8;padding:24px 40px;text-align:center;border-top:1px solid #eee">
<p style="font-size:12px;color:#aaa;margin:0">© 2026 CVBoost — Milann Rua</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: 'CVBoost <onboarding@resend.dev>',
      to: email,
      subject: `✅ Accès activé — Ton plan ${planLabel} est prêt !`,
      html
    })
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const signature = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!signature || !webhookSecret) {
    return { statusCode: 400, body: 'Configuration manquante' };
  }

  // Récupérer le body brut (nécessaire pour vérifier la signature Stripe)
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;

  // Vérifier que le webhook vient vraiment de Stripe
  if (!verifyStripeSignature(rawBody, signature, webhookSecret)) {
    return { statusCode: 400, body: 'Signature invalide' };
  }

  const stripeEvent = JSON.parse(rawBody);

  // On traite uniquement les paiements confirmés
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const email = session.customer_details?.email || session.customer_email;
    const amount = session.amount_total; // en centimes

    // Identifier le plan selon le montant payé
    let plan = null;
    if (amount === 299) plan = 'boost';       // 2,99€
    else if (amount === 1490) plan = 'pro';   // 14,90€

    if (email && plan) {
      // Mettre à jour le plan dans Supabase
      await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ plan })
        }
      );

      // Envoyer l'email de confirmation
      try {
        await sendPaymentEmail(email, plan);
      } catch (e) {
        console.error('Email non envoyé:', e.message);
      }
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
