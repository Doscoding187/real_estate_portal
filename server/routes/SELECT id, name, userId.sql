SELECT id, name, userId
FROM developers
WHERE userId = (SELECT id FROM users WHERE email='developer@test.local' LIMIT 1)
LIMIT 5;



