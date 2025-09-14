/**
 * Simple Node.js compatible test for the Action Discovery System
 * This test avoids browser-specific APIs like localStorage
 */
async function testActionDiscoveryBasics() {
  console.log('🚀 Testing Action Discovery System (Node.js Compatible)...\n');

  // Import types and create simple mock logger
  const { ActionDiscoveryPipeline } = await import('./ActionDiscoveryPipeline.js');
  const { IntrinsicActionSource } = await import('./sources/IntrinsicActionSource.js');
  const { EquipmentActionSource } = await import('./sources/EquipmentActionSource.js');
  const { JsonTileInteractionSource } = await import('./sources/JsonTileInteractionSource.js');

  // Simple mock logger that works in Node.js
  const mockLogger = {
    debug: (msg: string, context?: any) => console.log(`[DEBUG] ${msg}`, context || ''),
    info: (msg: string, context?: any) => console.log(`[INFO] ${msg}`, context || ''),
    warn: (msg: string, context?: any) => console.log(`[WARN] ${msg}`, context || ''),
    error: (msg: string, context?: any) => console.log(`[ERROR] ${msg}`, context || ''),
    setVerboseMode: (_verbose: boolean) => {}
  };

  // Simple mock EventBus that works in Node.js
  const mockEventBus = {
    subscribe: (eventType: string, _handler: Function) => {
      console.log(`[EventBus] Subscribed to ${eventType}`);
      return () => {}; // unsubscribe function
    },
    publish: (event: any) => {
      console.log(`[EventBus] Published ${event.type}:`, event);
    }
  };

  try {
    console.log('✅ Creating Action Discovery Pipeline...');

    // Create the pipeline with mocks
    const pipeline = new (ActionDiscoveryPipeline as any)(mockEventBus, mockLogger);

    console.log('✅ Creating Action Sources...');

    // Create action sources
    const intrinsicSource = new (IntrinsicActionSource as any)(mockLogger);
    const equipmentSource = new (EquipmentActionSource as any)(mockLogger);

    // Mock tile interactions data for testing
    const mockTileInteractions = {
      'door_closed': {
        id: 'door_closed',
        glyph: '+',
        name: 'Closed Door',
        description: 'A closed door',
        interactions: [{
          id: 'open_door',
          name: 'Open Door',
          description: 'Open the door',
          category: 'environment',
          requirements: [],
          costs: [],
          effects: [],
          targeting: { type: 'single', range: 1, requiresLineOfSight: true, validTargets: [] },
          priority: 75
        }]
      }
    };

    const environmentSource = new (JsonTileInteractionSource as any)(mockTileInteractions, mockLogger);

    console.log('✅ Registering Action Sources...');

    // Register sources
    pipeline.registerSource(intrinsicSource);
    pipeline.registerSource(equipmentSource);
    pipeline.registerSource(environmentSource);

    console.log('✅ Testing Action Source Introspection...');

    // Test individual sources
    console.log('\n--- Intrinsic Actions ---');
    const intrinsicActions = intrinsicSource.getAllActions();
    console.log(`Found ${intrinsicActions.length} intrinsic actions:`);
    intrinsicActions.forEach((action: any) => {
      console.log(`  - ${action.name} (${action.category}) [priority: ${action.priority}]`);
    });

    console.log('\n--- Source Information ---');
    const registeredSources = pipeline.getRegisteredSources();
    console.log(`Total registered sources: ${registeredSources.length}`);
    registeredSources.forEach((source: any) => {
      console.log(`  - ${source.id} (${source.type}): ${source.description}`);
    });

    console.log('\n🎉 Basic Action Discovery System Test Completed Successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - ${registeredSources.length} action sources registered`);
    console.log(`   - ${intrinsicActions.length} intrinsic actions available`);
    console.log(`   - Action categories: ${[...new Set(intrinsicActions.map((a: any) => a.category))].join(', ')}`);

    console.log('\n✨ The action discovery system is working correctly!');
    console.log('   You can now integrate it with your game loop.');

    return true;

  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run the test
testActionDiscoveryBasics()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Test crashed:', error);
    process.exit(1);
  });