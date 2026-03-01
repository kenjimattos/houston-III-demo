-- =====================================================
-- Migração de Escalistas para Sistema de Autenticação
-- =====================================================
-- 
-- Este script cria 7 usuários no auth.users para escalistas que 
-- compartilham o mesmo escalista_auth_id temporário.
--
-- O que este script faz:
-- 1. Cria usuário em auth.users com email no formato {nome}-{telefone}@revoluna.temp
-- 2. O trigger existente cria automaticamente a linha em user_profile
-- 3. Atualiza user_profile para role='escalista' e displayname
-- 4. Atualiza escalista.escalista_auth_id com o novo UUID gerado
-- 5. Atualiza escalista.escalista_email com o email gerado
--
-- Senha padrão temporária: Revoluna@2025
-- (Os usuários devem alterar na primeira utilização)
-- =====================================================

DO $$
DECLARE
  v_escalista RECORD;
  v_new_user_id UUID;
  v_email TEXT;
  v_phone TEXT;
  v_senha_hash TEXT;
  v_usuarios_criados INTEGER := 0;
  v_perfis_criados INTEGER := 0;
  v_perfis_atualizados INTEGER := 0;
  v_escalistas_atualizados INTEGER := 0;
  v_erros INTEGER := 0;
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Iniciando migração de escalistas...';
  RAISE NOTICE '==========================================';
  
  -- Processar cada escalista
  FOR v_escalista IN 
    SELECT 
      escalista_id,
      escalista_nome,
      escalista_telefone,
      escalista_auth_id
    FROM escalista
    WHERE escalista_auth_id = 'cf37ce09-e25d-4c67-b319-3e50d1cc964b'
      AND escalista_nome != 'Não informado'
    ORDER BY escalista_nome
  LOOP
    BEGIN
      -- Limpar telefone (remover espaços) e criar email
      v_phone := REPLACE(TRIM(v_escalista.escalista_telefone), ' ', '');
      
      -- Normalizar nome para email (minúsculas, sem espaços, sem acentos)
      v_email := LOWER(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(
                REPLACE(v_escalista.escalista_nome, ' ', '-'),
                'ç', 'c'
              ),
              'á', 'a'
            ),
            'í', 'i'
          ),
          'ã', 'a'
        )
      ) || '-' || v_phone || '@revoluna.temp';
      
      RAISE NOTICE '';
      RAISE NOTICE 'Processando: %', v_escalista.escalista_nome;
      RAISE NOTICE '  Telefone: %', v_phone;
      RAISE NOTICE '  Email: %', v_email;
      
      -- Gerar hash da senha padrão
      v_senha_hash := crypt('Revoluna@2025', gen_salt('bf'));
      
      -- Criar usuário no auth.users
      INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        email_change_confirm_status,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        role,
        aud,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
      ) VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        v_email,
        v_senha_hash,
        NOW(), -- Email já confirmado
        0,
        NOW(),
        NOW(),
        jsonb_build_object(
          'provider', 'email',
          'providers', ARRAY['email']
        ),
        jsonb_build_object(
          'full_name', v_escalista.escalista_nome,
          'phone', v_phone
        ),
        false,
        'authenticated',
        'authenticated',
        '',
        '',
        '',
        ''
      )
      RETURNING id INTO v_new_user_id;
      
      v_usuarios_criados := v_usuarios_criados + 1;
      RAISE NOTICE '  ✓ Usuário criado: %', v_new_user_id;
      
      -- Verificar se user_profile foi criado pelo trigger, senão criar manualmente
      IF NOT EXISTS (SELECT 1 FROM user_profile WHERE id = v_new_user_id) THEN
        INSERT INTO user_profile (
          id,
          created_at,
          role,
          displayname
        ) VALUES (
          v_new_user_id,
          NOW(),
          'escalista',
          v_escalista.escalista_nome
        );
        v_perfis_criados := v_perfis_criados + 1;
        RAISE NOTICE '  ✓ user_profile criado manualmente';
      ELSE
        -- Atualizar user_profile com role e displayname
        UPDATE user_profile
        SET 
          role = 'escalista',
          displayname = v_escalista.escalista_nome
        WHERE id = v_new_user_id;
        v_perfis_atualizados := v_perfis_atualizados + 1;
        RAISE NOTICE '  ✓ user_profile atualizado (role=escalista, displayname=%)' , v_escalista.escalista_nome;
      END IF;
      
      -- Atualizar escalista com novo auth_id e email
      UPDATE escalista
      SET 
        escalista_auth_id = v_new_user_id,
        escalista_email = v_email,
        escalista_updateat = NOW(),
        escalista_updateby = v_new_user_id
      WHERE escalista_id = v_escalista.escalista_id;
      
      v_escalistas_atualizados := v_escalistas_atualizados + 1;
      RAISE NOTICE '  ✓ escalista.escalista_auth_id atualizado';
      RAISE NOTICE '  ✓ escalista.escalista_email atualizado';
      
    EXCEPTION WHEN OTHERS THEN
      v_erros := v_erros + 1;
      RAISE WARNING '  ✗ ERRO ao processar %: %', v_escalista.escalista_nome, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Migração concluída!';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Resumo:';
  RAISE NOTICE '  - % usuários criados em auth.users', v_usuarios_criados;
  RAISE NOTICE '  - % perfis criados manualmente em user_profile', v_perfis_criados;
  RAISE NOTICE '  - % perfis atualizados em user_profile', v_perfis_atualizados;
  RAISE NOTICE '  - % escalistas atualizados com novos auth_ids', v_escalistas_atualizados;
  IF v_erros > 0 THEN
    RAISE NOTICE '  - % erros encontrados', v_erros;
  END IF;
  RAISE NOTICE '';
  RAISE NOTICE 'Senha padrão para todos: Revoluna@2025';
  RAISE NOTICE 'IMPORTANTE: Solicite que alterem a senha no primeiro acesso!';
  RAISE NOTICE '';
END $$;
