import { createConnection } from 'mysql2/promise';

async function testAgentIntegration() {
  const connection = await createConnection({
    host: 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '292qWmvn2YGy2jW.root',
    password: 'TOdjCJY1bepCcJg1',
    database: 'listify_property_sa',
    ssl: { rejectUnauthorized: false }
  });

  console.log('✅ Connected to TiDB\n');

  try {
    // Test 1: Insert conversation memory
    console.log('📝 Test 1: Storing conversation...');
    const [memoryResult] = await connection.query(
      `INSERT INTO agent_memory (session_id, conversation_id, user_id, user_input, agent_response, metadata) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'test-session-001',
        'conv-001',
        null,
        'What is the capital of France?',
        'The capital of France is Paris.',
        JSON.stringify({ model: 'gpt-4', tokens: 25, duration: 1200 })
      ]
    );
    console.log('✅ Conversation stored, ID:', memoryResult.insertId);

    // Test 2: Create a task
    console.log('\n📝 Test 2: Creating task...');
    const [taskResult] = await connection.query(
      `INSERT INTO agent_tasks (task_id, session_id, task_type, status, priority, input_data) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'task-001',
        'test-session-001',
        'property_search',
        'pending',
        1,
        JSON.stringify({ city: 'Cape Town', propertyType: 'apartment' })
      ]
    );
    console.log('✅ Task created, ID:', taskResult.insertId);

    // Test 3: Add knowledge
    console.log('\n📝 Test 3: Adding knowledge...');
    const [knowledgeResult] = await connection.query(
      `INSERT INTO agent_knowledge (topic, content, category, tags, metadata, is_active) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'Property Search Tips',
        'When searching for properties in South Africa, consider location, price range, and property type.',
        'real_estate',
        JSON.stringify(['property', 'search', 'tips']),
        JSON.stringify({ source: 'internal', confidence: 0.95 }),
        1
      ]
    );
    console.log('✅ Knowledge added, ID:', knowledgeResult.insertId);

    // Test 4: Retrieve conversation history
    console.log('\n📝 Test 4: Retrieving conversation history...');
    const [conversations] = await connection.query(
      'SELECT * FROM agent_memory WHERE session_id = ? ORDER BY created_at DESC LIMIT 5',
      ['test-session-001']
    );
    console.log('✅ Retrieved', conversations.length, 'conversation(s)');

    // Test 5: Search knowledge
    console.log('\n📝 Test 5: Searching knowledge...');
    const [knowledge] = await connection.query(
      `SELECT * FROM agent_knowledge 
       WHERE is_active = 1 AND (topic LIKE ? OR content LIKE ?) 
       LIMIT 5`,
      ['%property%', '%property%']
    );
    console.log('✅ Found', knowledge.length, 'knowledge item(s)');

    // Test 6: Update task status
    console.log('\n📝 Test 6: Updating task status...');
    await connection.query(
      `UPDATE agent_tasks 
       SET status = ?, started_at = NOW(), updated_at = NOW() 
       WHERE task_id = ?`,
      ['running', 'task-001']
    );
    console.log('✅ Task status updated to "running"');

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await connection.query('DELETE FROM agent_memory WHERE session_id = ?', ['test-session-001']);
    await connection.query('DELETE FROM agent_tasks WHERE task_id = ?', ['task-001']);
    await connection.query('DELETE FROM agent_knowledge WHERE topic = ?', ['Property Search Tips']);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All tests passed! Agent database integration is working correctly.');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

testAgentIntegration().catch(console.error);
