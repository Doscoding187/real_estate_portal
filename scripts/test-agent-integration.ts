/**
 * Test script for TiDB Agent Integration
 * Tests all CRUD operations for agent memory, tasks, and knowledge base
 */

import * as agentService from '../server/services/agentService';

async function testAgentIntegration() {
	console.log('🚀 Starting TiDB Agent Integration Test...\n');

	try {
		// Test 1: Store Conversation
		console.log('📝 Test 1: Storing conversation...');
		const memoryId = await agentService.storeConversation({
			sessionId: 'test-session-' + Date.now(),
			conversationId: 'test-conv-1',
			userInput: 'What is TiDB?',
			agentResponse: 'TiDB is a distributed SQL database that supports HTAP workloads.',
			metadata: {
				model: 'claude-4.5-sonnet',
				tokens: 150,
				duration: 1200,
			},
		});
		console.log('✅ Memory stored with ID:', memoryId);

		// Test 2: Create Task
		console.log('\n📋 Test 2: Creating task...');
		const taskId = 'task-' + Date.now();
		const taskDbId = await agentService.createTask({
			taskId,
			taskType: 'data_analysis',
			inputData: { query: 'test query', params: { limit: 10 } },
			priority: 1,
		});
		console.log('✅ Task created with ID:', taskDbId);

		// Test 3: Update Task Status
		console.log('\n🔄 Test 3: Updating task status...');
		await agentService.updateTaskStatus(taskId, 'running');
		console.log('✅ Task status updated to: running');

		await agentService.updateTaskStatus(taskId, 'completed', {
			result: 'Analysis complete',
			recordsProcessed: 100,
		});
		console.log('✅ Task status updated to: completed');

		// Test 4: Get Task
		console.log('\n🔍 Test 4: Retrieving task...');
		const task = await agentService.getTaskById(taskId);
		console.log('✅ Task retrieved:', {
			id: task.id,
			status: task.status,
			type: task.taskType,
		});

		// Test 5: Add Knowledge
		console.log('\n📚 Test 5: Adding knowledge...');
		const knowledgeId = await agentService.addKnowledge({
			topic: 'TiDB Features',
			content: 'TiDB supports HTAP workloads, horizontal scalability, and MySQL compatibility.',
			category: 'database',
			tags: ['tidb', 'distributed', 'sql'],
			metadata: {
				source: 'TiDB Documentation',
				confidence: 0.95,
			},
		});
		console.log('✅ Knowledge added with ID:', knowledgeId);

		// Test 6: Search Knowledge
		console.log('\n🔎 Test 6: Searching knowledge...');
		const results = await agentService.searchKnowledge('TiDB', 5);
		console.log('✅ Search results:', results.length, 'entries found');
		if (results.length > 0) {
			console.log('   First result:', {
				id: results[0].id,
				topic: results[0].topic,
			});
		}

		console.log('\n✨ All tests passed successfully!');
		console.log('\n📊 Summary:');
		console.log('  - Conversation stored ✓');
		console.log('  - Task created and updated ✓');
		console.log('  - Knowledge added and searched ✓');
		console.log('\n🎉 TiDB Agent Integration is working correctly!');
	} catch (error) {
		console.error('\n❌ Test failed:', error);
		process.exit(1);
	}
}

// Run the test
testAgentIntegration()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error('Fatal error:', error);
		process.exit(1);
	});
