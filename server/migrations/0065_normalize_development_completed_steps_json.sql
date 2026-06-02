UPDATE developments
SET completed_steps = CAST(JSON_UNQUOTE(completed_steps) AS JSON)
WHERE completed_steps IS NOT NULL
  AND JSON_TYPE(completed_steps) = 'STRING'
  AND JSON_VALID(JSON_UNQUOTE(completed_steps))
  AND JSON_TYPE(CAST(JSON_UNQUOTE(completed_steps) AS JSON)) = 'ARRAY';
