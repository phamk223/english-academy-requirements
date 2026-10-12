-- Reference data required in every environment. No user or password is seeded.
INSERT INTO academy.roles (code)
VALUES ('ADMIN'), ('TEACHER'), ('STUDENT')
ON CONFLICT (code) DO NOTHING;
