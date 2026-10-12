-- node-argon2 can encode PHC parameters as m,p,t or m,t,p.
-- Preserve already-applied migrations and support both valid encodings.
ALTER TABLE academy.users DROP CONSTRAINT ck_users_password_hash;
ALTER TABLE academy.users ADD CONSTRAINT ck_users_password_hash CHECK (
    password_hash ~ '^\$argon2id\$v=19\$m=[1-9][0-9]*,(t=[1-9][0-9]*,p=[1-9][0-9]*|p=[1-9][0-9]*,t=[1-9][0-9]*)\$[A-Za-z0-9+/]{16,}\$[A-Za-z0-9+/]{32,}$'
);
