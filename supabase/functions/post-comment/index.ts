import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token, article_id, author_name, author_email, content, is_anonymous, post_url } = await req.json()

    // 1. Valida ReCAPTCHA
    const secretKey = Deno.env.get('RECAPTCHA_SECRET_KEY')
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`
    const recaptchaRes = await fetch(verifyUrl, { method: 'POST' })
    const recaptchaData = await recaptchaRes.json()

    if (!recaptchaData.success) {
      return new Response(
        JSON.stringify({ error: 'Captcha inválido.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. RATE LIMIT
    if (!is_anonymous && author_email) {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
      const { count } = await supabaseClient
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('author_email', author_email)
        .gt('created_at', oneMinuteAgo)

      if (count && count >= 3) {
        return new Response(
          JSON.stringify({ error: 'Muitos comentários. Aguarde um pouco.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // 3. Insere comentário
    const { data, error } = await supabaseClient
      .from('comments')
      .insert({
        article_id,
        author_name,
        author_email,
        content,
        is_anonymous
      })
      .select()
      .single()

    if (error) throw error

    // 4. NOTIFICAÇÃO POR EMAIL (Bloco Seguro)
    // Usamos um try/catch isolado para que erro no email NÃO afete a resposta de sucesso do comentário
    try {
      const resendApiKey = Deno.env.get('RESEND_API_KEY')
      const adminEmail = Deno.env.get('ADMIN_EMAIL')

      if (resendApiKey && adminEmail) {
        // Busca título do artigo
        const { data: article } = await supabaseClient
          .from('articles')
          .select('title')
          .eq('id', article_id)
          .single()

        const articleTitle = article?.title || 'Post sem título'
        const authorDisplay = isAnonymous ? 'Anônimo' : author_name
        
        const emailSubject = `Novo comentário em: ${articleTitle}`
        
        const emailHtml = `
          <div style="font-family: sans-serif; color: #333;">
            <h2>Novo Comentário Recebido</h2>
            <p><strong>Post:</strong> <a href="${post_url || '#'}">${articleTitle}</a></p>
            <p><strong>Autor:</strong> ${authorDisplay} ${author_email ? `(${author_email})` : ''}</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 16px; line-height: 1.5;">"${content}"</p>
            <br />
            <a href="${post_url || '#'}" style="background-color: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver comentário no site</a>
          </div>
        `

        // IMPORTANTE: Adicionado 'await' para garantir que o envio termine antes da função fechar
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Luccas Notes <onboarding@resend.dev>',
            to: adminEmail,
            subject: emailSubject,
            html: emailHtml
          })
        })
      }
    } catch (emailError) {
      // Apenas logamos o erro do email, mas não travamos a resposta para o usuário
      console.error('Erro ao enviar email de notificação:', emailError)
    }

    // 5. Retorna Sucesso
    return new Response(
      JSON.stringify({ data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro geral na função:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})