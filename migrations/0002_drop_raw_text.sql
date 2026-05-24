-- LGPD art. 6º III (minimização): a coluna raw_text foi definida no schema
-- inicial mas nunca chegou a ser preenchida pela aplicação. Mantê-la cria um
-- campo armadilha que poderia receber PII sem necessidade declarada — viola
-- o princípio de minimização. Removida.
--
-- D1 / SQLite >= 3.35 suportam ALTER TABLE DROP COLUMN nativamente.
ALTER TABLE decisoes DROP COLUMN raw_text;
