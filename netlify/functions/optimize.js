exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { cv, job, mode, token } = JSON.parse(event.body);

    const SUPABASE_URL = 'https://aunoabtcgtnglrhcvaax.supabase.co';
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    const ADMIN_EMAIL = 'milann.rua2@gmail.com';
    const CV_FREE = 1, LDM_FREE = 1, CV_BOOST = 5, LDM_BOOST = 5;
    const type = mode === 'ldm' ? 'ldm' : 'cv';

    let supabaseUserId = null, supabaseField = null, supabaseNewVal = null;

    // === VÉRIFICATION DES CRÉDITS CÔTÉ SERVEUR ===
    // Si l'utilisateur est connecté (token fourni), on vérifie dans Supabase
    if (token && SUPABASE_SERVICE_KEY) {
      // 1. Identifier l'utilisateur depuis son token
      const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_SERVICE_KEY
        }
      });

      if (userRes.ok) {
        const user = await userRes.json();

        // L'admin passe toujours
        if (user.email !== ADMIN_EMAIL && user.id) {
          // 2. Récupérer son profil (crédits, plan)
          const profileRes = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=*`,
            {
              headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'apikey': SUPABASE_SERVICE_KEY
              }
            }
          );
          const profiles = await profileRes.json();
          const profile = profiles[0];

          if (profile) {
            // 3. Calculer la limite selon le plan
            const plan = profile.plan;
            const limit = plan === 'pro' ? Infinity
              : plan === 'boost' ? (type === 'cv' ? CV_FREE + CV_BOOST : LDM_FREE + LDM_BOOST)
              : (type === 'cv' ? CV_FREE : LDM_FREE);

            const used = type === 'cv' ? (profile.cv_used || 0) : (profile.ldm_used || 0);

            // 4. Bloquer si plus de crédits
            if (used >= limit) {
              return {
                statusCode: 403,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Crédits épuisés. Choisis un plan pour continuer.' })
              };
            }

            // Mémoriser pour incrémenter après succès de l'IA
            supabaseUserId = user.id;
            supabaseField = type === 'cv' ? 'cv_used' : 'ldm_used';
            supabaseNewVal = used + 1;
          }
        }
      }
    }

    // === APPEL À L'IA ===
    let prompt;

    if (mode === 'ldm') {
      prompt = `Tu es un expert en rédaction de lettres de motivation pour le marché français.
Rédige une lettre de motivation professionnelle, personnalisée et percutante basée sur ce CV et cette offre d'emploi.

La lettre doit :
- Faire 3-4 paragraphes
- Commencer par une accroche forte et personnalisée
- Mettre en valeur les expériences les plus pertinentes du CV par rapport à l'offre
- Terminer par une formule de politesse professionnelle
- Être en français, ton professionnel mais dynamique
- Ne PAS inclure les coordonnées (date, adresse) - juste le corps de la lettre

Retourne UNIQUEMENT le texte de la lettre, sans JSON, sans balises, sans explications.

CV :
${cv}

OFFRE D'EMPLOI :
${job}`;
    } else {
      prompt = `Tu es un expert en optimisation de CV pour le marché français. Analyse ce CV et cette offre d'emploi, puis retourne UNIQUEMENT un objet JSON valide (sans markdown, sans backticks) avec cette structure exacte:

{
  "score_initial": <nombre entre 20 et 65>,
  "score_final": <nombre entre 70 et 97>,
  "cv_optimise": "<CV complet réécrit et optimisé, avec \\n pour les sauts de ligne>",
  "mots_cles_ajoutes": ["mot1", "mot2", "mot3", "mot4", "mot5", "mot6"],
  "mots_cles_manquants": ["mot1", "mot2", "mot3"],
  "criteres": [
    {"nom": "Mots-clés ATS", "score": <0-100>},
    {"nom": "Mise en forme", "score": <0-100>},
    {"nom": "Bullet points", "score": <0-100>},
    {"nom": "Résumé pro", "score": <0-100>},
    {"nom": "Compétences", "score": <0-100>},
    {"nom": "Expériences", "score": <0-100>}
  ],
  "conseils": [
    {"titre": "conseil court", "texte": "explication détaillée de 1-2 phrases"},
    {"titre": "conseil court", "texte": "explication détaillée de 1-2 phrases"},
    {"titre": "conseil court", "texte": "explication détaillée de 1-2 phrases"}
  ]
}

CV À OPTIMISER:
${cv}

OFFRE D'EMPLOI CIBLÉE:
${job}

Instructions: intègre les mots-clés de l'offre, réécris les bullet points avec des verbes d'action et métriques, ajoute un résumé professionnel percutant, adapte le profil à l'offre sans mentir.`;
    }

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: mode === 'ldm' ? 2000 : 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const aiData = await aiRes.json();
    if (!aiRes.ok) return { statusCode: 500, body: JSON.stringify({ error: aiData.error?.message }) };

    // === INCRÉMENTER LE COMPTEUR DANS SUPABASE APRÈS SUCCÈS ===
    if (supabaseUserId && SUPABASE_SERVICE_KEY) {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${supabaseUserId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ [supabaseField]: supabaseNewVal })
      });
    }

    // === RETOURNER LE RÉSULTAT ===
    if (mode === 'ldm') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lettre_motivation: aiData.content[0].text.trim() })
      };
    }

    const text = aiData.content[0].text.trim().replace(/```json|```/g, '').trim();
    const result = JSON.parse(text);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
