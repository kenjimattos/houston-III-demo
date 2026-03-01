-- Fix schedule conflict functions to handle medico_precadastro_id
-- This migration corrects the functions to properly check conflicts for both medico_id and medico_precadastro_id

CREATE OR REPLACE FUNCTION verificar_conflito_vaga_designada(
     p_medico_id UUID,
     p_data date,
     p_hora_inicio time,
     p_hora_fim time
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  medico_userid uuid;
  conflito_encontrado boolean := false;
  vaga_data date;
  vaga_inicio time;
  vaga_fim time;
  vaga_conflitante_info text;
  current_user_id uuid;
  current_user_role text;
  
  -- Adicionar variáveis para timestamps
  vaga_inicio_ts timestamp;
  vaga_fim_ts timestamp;

BEGIN
  
  medico_userid := p_medico_id;
  vaga_data := p_data;
  vaga_inicio := p_hora_inicio;
  vaga_fim := p_hora_fim;

  -- CONVERTER para timestamps considerando turnos noturnos
  vaga_inicio_ts := vaga_data + vaga_inicio;
  
  -- Se hora fim <= hora início, é turno noturno (vai para o dia seguinte)
  IF vaga_fim <= vaga_inicio THEN
      vaga_fim_ts := (vaga_data + INTERVAL '1 day') + vaga_fim;
  ELSE
      vaga_fim_ts := vaga_data + vaga_fim;
  END IF;
  
  -- Verificar conflitos de horário considerando medico_id e medico_precadastro_id
  SELECT 
      EXISTS (
          SELECT 1
          FROM candidaturas c
          JOIN vagas v ON c.vagas_id = v.vagas_id
          WHERE (
              -- Para médicos normais
              (c.medico_id = medico_userid AND c.medico_id <> '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid)
              OR
              -- Para médicos pré-cadastrados
              (c.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid AND c.medico_precadastro_id = medico_userid)
          )
          AND c.candidatura_status = 'APROVADO'
          AND (
              -- Usar OVERLAPS com timestamps calculados
              (v.vagas_data + v.vagas_horainicio, 
               CASE 
                   WHEN v.vagas_horafim <= v.vagas_horainicio 
                   THEN (v.vagas_data + INTERVAL '1 day') + v.vagas_horafim
                   ELSE v.vagas_data + v.vagas_horafim
               END
              ) OVERLAPS 
              (vaga_inicio_ts, vaga_fim_ts)
          )
      ),
      (
          SELECT 'Plantão já aprovado: ' || v.vagas_data || ' das ' || v.vagas_horainicio || ' às ' || v.vagas_horafim ||
                 CASE WHEN v.vagas_horafim <= v.vagas_horainicio THEN ' (madrugada)' ELSE '' END
          FROM candidaturas c
          JOIN vagas v ON c.vagas_id = v.vagas_id
          WHERE (
              -- Para médicos normais
              (c.medico_id = medico_userid AND c.medico_id <> '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid)
              OR
              -- Para médicos pré-cadastrados
              (c.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid AND c.medico_precadastro_id = medico_userid)
          )
          AND c.candidatura_status = 'APROVADO'
          AND (
              (v.vagas_data + v.vagas_horainicio, 
               CASE 
                   WHEN v.vagas_horafim <= v.vagas_horainicio 
                   THEN (v.vagas_data + INTERVAL '1 day') + v.vagas_horafim
                   ELSE v.vagas_data + v.vagas_horafim
               END
              ) OVERLAPS 
              (vaga_inicio_ts, vaga_fim_ts)
          )
          LIMIT 1
      )
  INTO conflito_encontrado, vaga_conflitante_info;
         
  -- Bloquear se houver conflito de horário
  IF conflito_encontrado THEN
      RAISE EXCEPTION 'CONFLITO DE HORÁRIO DETECTADO: %', vaga_conflitante_info;
  END IF;

END;
$$;

CREATE OR REPLACE FUNCTION verificar_conflito_antes_candidatura()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    medico_userid uuid;
    conflito_encontrado boolean := false;
    vaga_data date;
    vaga_inicio time;
    vaga_fim time;
    vaga_conflitante_info text;
    current_user_id uuid;
    current_user_role text;
    
    -- Adicionar variáveis para timestamps
    vaga_inicio_ts timestamp;
    vaga_fim_ts timestamp;
BEGIN
    
    -- Verificar o role atual do usuário
    current_user_id := auth.uid();
    RAISE NOTICE 'Usuário atual: %', current_user_id;

    -- Verificar se o usuário existe no user_profile
    SELECT role INTO current_user_role
    FROM user_profile
    WHERE id = current_user_id;

    -- Buscar dados da vaga
    SELECT 
        -- Determinar qual medico_id usar baseado na lógica do sistema
        CASE 
            WHEN NEW.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid AND NEW.medico_precadastro_id IS NOT NULL 
            THEN NEW.medico_precadastro_id
            ELSE NEW.medico_id
        END,
        v.vagas_data, 
        v.vagas_horainicio, 
        v.vagas_horafim
    INTO medico_userid, vaga_data, vaga_inicio, vaga_fim
    FROM vagas v
    WHERE v.vagas_id = NEW.vagas_id;
    
    -- CONVERTER para timestamps considerando turnos noturnos
    vaga_inicio_ts := vaga_data + vaga_inicio;
    
    -- Se hora fim <= hora início, é turno noturno (vai para o dia seguinte)
    IF vaga_fim <= vaga_inicio THEN
        vaga_fim_ts := (vaga_data + INTERVAL '1 day') + vaga_fim;
    ELSE
        vaga_fim_ts := vaga_data + vaga_fim;
    END IF;
    
    -- VERIFICAÇÃO 1: Impedir candidatura em vagas com data passada
    IF vaga_data < CURRENT_DATE AND current_user_role = 'free' THEN
        RAISE EXCEPTION 'CANDIDATURA BLOQUEADA: Não é possível se candidatar em vaga com data passada. Data da vaga: %', vaga_data;
    END IF;
    
    -- VERIFICAÇÃO 2: Verificar conflitos de horário considerando medico_id e medico_precadastro_id
    SELECT 
        EXISTS (
            SELECT 1
            FROM candidaturas c
            JOIN vagas v ON c.vagas_id = v.vagas_id
            WHERE (
                -- Para médicos normais
                (c.medico_id = medico_userid AND c.medico_id <> '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid)
                OR
                -- Para médicos pré-cadastrados
                (c.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid AND c.medico_precadastro_id = medico_userid)
            )
            AND c.candidatura_status = 'APROVADO'
            AND (
                -- Usar OVERLAPS com timestamps calculados
                (v.vagas_data + v.vagas_horainicio, 
                 CASE 
                     WHEN v.vagas_horafim <= v.vagas_horainicio 
                     THEN (v.vagas_data + INTERVAL '1 day') + v.vagas_horafim
                     ELSE v.vagas_data + v.vagas_horafim
                 END
                ) OVERLAPS 
                (vaga_inicio_ts, vaga_fim_ts)
            )
        ),
        (
            SELECT 'Plantão já aprovado: ' || v.vagas_data || ' das ' || v.vagas_horainicio || ' às ' || v.vagas_horafim ||
                   CASE WHEN v.vagas_horafim <= v.vagas_horainicio THEN ' (madrugada)' ELSE '' END
            FROM candidaturas c
            JOIN vagas v ON c.vagas_id = v.vagas_id
            WHERE (
                -- Para médicos normais
                (c.medico_id = medico_userid AND c.medico_id <> '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid)
                OR
                -- Para médicos pré-cadastrados
                (c.medico_id = '9cd29712-91b5-492f-86ff-41e38c7b03d5'::uuid AND c.medico_precadastro_id = medico_userid)
            )
            AND c.candidatura_status = 'APROVADO'
            AND (
                (v.vagas_data + v.vagas_horainicio, 
                 CASE 
                     WHEN v.vagas_horafim <= v.vagas_horainicio 
                     THEN (v.vagas_data + INTERVAL '1 day') + v.vagas_horafim
                     ELSE v.vagas_data + v.vagas_horafim
                 END
                ) OVERLAPS 
                (vaga_inicio_ts, vaga_fim_ts)
            )
            LIMIT 1
        )
    INTO conflito_encontrado, vaga_conflitante_info;
           
    -- Bloquear se houver conflito de horário
    IF conflito_encontrado THEN
        RAISE EXCEPTION 'CONFLITO DE HORÁRIO DETECTADO: %', vaga_conflitante_info;
    END IF;
    
    -- Se chegou até aqui, as validações passaram
    RETURN NEW;  -- Para trigger
    
END;
$function$;