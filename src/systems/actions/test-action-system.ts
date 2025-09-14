import { EventBus } from '../../core/events/EventBus';
import { Logger } from '../../utils/Logger';
import { ErrorHandler } from '../../utils/ErrorHandler';
import { ActionSystemExample } from './ActionSystemExample';

/**
 * Simple test script to verify the Action Discovery System
 * Run with: npx tsx src/systems/actions/test-action-system.ts
 */
async function testActionSystem() {
  console.log('🚀 Starting Action Discovery System Test...\n');

  // Initialize required systems
  const logger = Logger.getInstance();
  const errorHandler = ErrorHandler.getInstance();
  const eventBus = new EventBus({}, logger, errorHandler);

  // Set logger to verbose mode for detailed output
  logger.setVerboseMode(true);

  try {
    // Create the action system example
    const actionSystem = new ActionSystemExample(eventBus, logger);

    console.log('✅ Action system initialized successfully\n');

    // Run all demonstrations
    await actionSystem.runAllDemonstrations();

    console.log('\n🎉 All tests completed successfully!');
    console.log('📊 Check the detailed logs above for discovered actions');

    // Clean up
    actionSystem.destroy();

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testActionSystem();