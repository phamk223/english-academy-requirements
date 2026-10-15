CREATE FUNCTION academy.audit_session_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE row_data jsonb;
BEGIN
 row_data := CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 INSERT INTO academy.audit_log(kind,actor_id,resource_type,resource_id,action)
 VALUES('DATABASE',(row_data->>'user_id')::uuid,'auth_sessions',row_data->>'id',TG_OP);
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END; $$;
CREATE TRIGGER audit_session_changes AFTER INSERT OR UPDATE OR DELETE ON academy.auth_sessions
FOR EACH ROW EXECUTE FUNCTION academy.audit_session_change();
