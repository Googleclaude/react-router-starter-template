-- Soft delete: marcar registros como removidos sem apagar fisicamente.
-- Listagens de produção filtram WHERE deleted_at IS NULL; a rota /lixeira
-- mostra os removidos e permite restaurar ou apagar definitivamente.
ALTER TABLE decisoes ADD COLUMN deleted_at TEXT;

-- Índice parcial para a lixeira (somente registros removidos). Pequeno e
-- só atualizado nos eventos raros de delete/restore.
CREATE INDEX IF NOT EXISTS idx_decisoes_deleted_at
  ON decisoes (deleted_at)
  WHERE deleted_at IS NOT NULL;
