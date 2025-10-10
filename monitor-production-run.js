/**
 * Real-Time Production Run Monitor
 * 
 * This script monitors the progress of the video generation pipeline
 * by checking CloudWatch logs, DynamoDB tables, and S3 bucket for updates.
 */

const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({
  region: 'us-east-1'
});

const cloudWatchLogs = new AWS.CloudWatchLogs();
const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

// Configuration
const BUCKET_NAME = 'automated-video-pipeline-v2-786673323159-us-east-1';
const CONTEXT_TABLE = 'automated-video-pipeline-context-v2';
const COSTS_TABLE = 'automated-video-pipeline-costs';
const JOBS_TABLE = 'automated-video-pipeline-jobs-v2';

// Pipeline stages
const PIPELINE_STAGES = [
  { name: 'Topic Management', function: 'automated-video-pipeline-topic-management-v3', emoji: '📋' },
  { name: 'Script Generation', function: 'automated-video-pipeline-script-generator-v3', emoji: '📝' },
  { name: 'Media Curation', function: 'automated-video-pipeline-media-curator-v3', emoji: '🎨' },
  { name: 'Audio Generation', function: 'automated-video-pipeline-audio-generator-v3', emoji: '🎙️' },
  { name: 'Video Assembly', function: 'automated-video-pipeline-video-assembler-v3', emoji: '🎬' },
  { name: 'YouTube Publishing', function: 'automated-video-pipeline-youtube-publisher-v3', emoji: '📺' },
  { name: 'Cost Tracking', function: 'automated-video-pipeline-cost-tracker', emoji: '💰' }
];

class ProductionMonitor {
  constructor() {
    this.startTime = new Date();
    this.lastLogTime = {};
    this.stageStatus = {};
    this.projectId = null;
    this.totalCost = 0;
    this.assetsFound = [];
    
    // Initialize stage status
    PIPELINE_STAGES.forEach(stage => {
      this.stageStatus[stage.name] = 'pending';
      this.lastLogTime[stage.function] = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
    });
  }

  async start() {
    console.log('🔍 PRODUCTION RUN MONITOR STARTED');
    console.log('='.repeat(60));
    console.log(`Start Time: ${this.startTime.toISOString()}`);
    console.log('Monitoring pipeline progress...\n');

    // Start monitoring loop
    this.monitoringInterval = setInterval(() => {
      this.checkProgress();
    }, 10000); // Check every 10 seconds

    // Initial check
    await this.checkProgress();
  }

  async checkProgress() {
    const now = new Date();
    const elapsed = Math.floor((now - this.startTime) / 1000);
    
    console.log(`\n⏱️  [${this.formatTime(elapsed)}] Checking pipeline progress...`);
    
    try {
      // Check each stage
      await this.checkStages();
      
      // Check for project ID and assets
      await this.checkAssets();
      
      // Check costs
      await this.checkCosts();
      
      // Check context table for project ID
      await this.checkContextTable();
      
      // Display status
      this.displayStatus();
      
      // Check if complete
      if (this.isComplete()) {
        console.log('\n🎉 PIPELINE COMPLETE!');
        this.stop();
      }
      
    } catch (error) {
      console.error('❌ Monitoring error:', error.message);
    }
  }

  async checkStages() {
    for (const stage of PIPELINE_STAGES) {
      try {
        const logGroupName = `/aws/lambda/${stage.function}`;
        
        // Get recent log events
        const params = {
          logGroupName: logGroupName,
          startTime: this.lastLogTime[stage.function].getTime(),
          limit: 50
        };

        const response = await cloudWatchLogs.filterLogEvents(params).promise();
        
        if (response.events && response.events.length > 0) {
          // Update last log time
          this.lastLogTime[stage.function] = new Date();
          
          // Check for completion indicators
          const logs = response.events.map(e => e.message).join(' ');
          
          if (logs.includes('✅') || logs.includes('SUCCESS') || logs.includes('completed')) {
            this.stageStatus[stage.name] = 'completed';
          } else if (logs.includes('⏳') || logs.includes('processing') || logs.includes('generating')) {
            this.stageStatus[stage.name] = 'running';
          } else if (logs.includes('❌') || logs.includes('ERROR') || logs.includes('failed')) {
            this.stageStatus[stage.name] = 'failed';
          }

          // Extract project ID if found (multiple patterns)
          const projectPatterns = [
            /project[Id]*[:\s]+([a-zA-Z0-9\-_]+)/i,
            /projectId[:\s]*['"]*([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}-[0-9]{2}-[0-9]{2}_[a-zA-Z0-9\-_]+)/i,
            /([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}-[0-9]{2}-[0-9]{2}_[a-zA-Z0-9\-_]+)/
          ];
          
          for (const pattern of projectPatterns) {
            const match = logs.match(pattern);
            if (match && !this.projectId) {
              this.projectId = match[1];
              console.log(`📋 Project ID detected: ${this.projectId}`);
              break;
            }
          }
        }
      } catch (error) {
        // Log group might not exist yet, that's okay
        if (!error.code || error.code !== 'ResourceNotFoundException') {
          console.warn(`⚠️ Error checking ${stage.name}:`, error.message);
        }
      }
    }
  }

  async checkAssets() {
    try {
      // List all recent objects in S3 bucket (last 10 minutes)
      const params = {
        Bucket: BUCKET_NAME,
        MaxKeys: 100
      };

      const response = await s3.listObjectsV2(params).promise();
      
      if (response.Contents) {
        // Filter for recent objects (last 10 minutes)
        const recentObjects = response.Contents.filter(obj => {
          const objTime = new Date(obj.LastModified);
          const timeDiff = (new Date() - objTime) / 1000 / 60; // minutes
          return timeDiff <= 10;
        });
        
        const newAssets = recentObjects
          .map(obj => obj.Key)
          .filter(key => !this.assetsFound.includes(key));
        
        newAssets.forEach(asset => {
          console.log(`📁 New asset: ${asset}`);
          this.assetsFound.push(asset);
          
          // Try to extract project ID from asset path
          if (!this.projectId) {
            const projectMatch = asset.match(/([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}-[0-9]{2}-[0-9]{2}_[a-zA-Z0-9\-_]+)/);
            if (projectMatch) {
              this.projectId = projectMatch[1];
              console.log(`📋 Project ID detected from S3: ${this.projectId}`);
            }
          }
        });
      }
    } catch (error) {
      console.warn('⚠️ Error checking S3 assets:', error.message);
    }
  }

  async checkCosts() {
    try {
      // Query recent costs
      const params = {
        TableName: COSTS_TABLE,
        FilterExpression: '#timestamp > :startTime',
        ExpressionAttributeNames: {
          '#timestamp': 'timestamp'
        },
        ExpressionAttributeValues: {
          ':startTime': this.startTime.toISOString()
        }
      };

      const response = await dynamodb.scan(params).promise();
      
      if (response.Items) {
        const newCosts = response.Items.reduce((sum, item) => sum + (item.cost || 0), 0);
        if (newCosts !== this.totalCost) {
          const costDiff = newCosts - this.totalCost;
          this.totalCost = newCosts;
          console.log(`💰 Cost update: +$${costDiff.toFixed(4)} (Total: $${this.totalCost.toFixed(4)})`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Error checking costs:', error.message);
    }
  }

  async checkContextTable() {
    try {
      // Scan context table for recent entries
      const params = {
        TableName: CONTEXT_TABLE,
        Limit: 20
      };

      const response = await dynamodb.scan(params).promise();
      
      if (response.Items) {
        // Look for topic context entries
        const topicContexts = response.Items.filter(item => 
          item.PK && item.PK.includes('topic') && 
          item.SK && item.SK.includes('2025-10-10')
        );
        
        if (topicContexts.length > 0 && !this.projectId) {
          // Try to extract project ID from context
          const contextItem = topicContexts[0];
          if (contextItem.SK) {
            const projectMatch = contextItem.SK.match(/([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}-[0-9]{2}-[0-9]{2}_[a-zA-Z0-9\-_]+)/);
            if (projectMatch) {
              this.projectId = projectMatch[1];
              console.log(`📋 Project ID detected from context: ${this.projectId}`);
            }
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Error checking context table:', error.message);
    }
  }

  displayStatus() {
    console.log('\n📊 PIPELINE STATUS:');
    console.log('-'.repeat(40));
    
    PIPELINE_STAGES.forEach(stage => {
      const status = this.stageStatus[stage.name];
      let statusIcon = '⏳';
      let statusText = 'Pending';
      
      switch (status) {
      case 'running':
        statusIcon = '🔄';
        statusText = 'Running';
        break;
      case 'completed':
        statusIcon = '✅';
        statusText = 'Complete';
        break;
      case 'failed':
        statusIcon = '❌';
        statusText = 'Failed';
        break;
      }
      
      console.log(`${stage.emoji} ${stage.name.padEnd(20)} ${statusIcon} ${statusText}`);
    });
    
    console.log('-'.repeat(40));
    console.log(`📋 Project ID: ${this.projectId || 'Not detected yet'}`);
    console.log(`📁 Assets Found: ${this.assetsFound.length}`);
    console.log(`💰 Total Cost: $${this.totalCost.toFixed(4)}`);
    console.log(`⏱️  Elapsed: ${this.formatTime(Math.floor((new Date() - this.startTime) / 1000))}`);
  }

  isComplete() {
    const completedStages = Object.values(this.stageStatus).filter(status => status === 'completed').length;
    const failedStages = Object.values(this.stageStatus).filter(status => status === 'failed').length;
    
    return completedStages >= 5 || failedStages > 0; // Complete if most stages done or any failed
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    console.log('\n🏁 MONITORING COMPLETE');
    console.log('='.repeat(60));
    
    const completedStages = Object.values(this.stageStatus).filter(status => status === 'completed').length;
    const failedStages = Object.values(this.stageStatus).filter(status => status === 'failed').length;
    
    if (completedStages >= 5) {
      console.log('🎉 SUCCESS: Pipeline completed successfully!');
      console.log(`📺 Video should be available on YouTube`);
      console.log(`💰 Total cost: $${this.totalCost.toFixed(4)}`);
      console.log(`📁 Assets created: ${this.assetsFound.length}`);
    } else if (failedStages > 0) {
      console.log('❌ FAILURE: Pipeline encountered errors');
      console.log('Check CloudWatch logs for detailed error information');
    }
    
    console.log('\n📋 Final Status:');
    this.displayStatus();
    
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Monitoring stopped by user');
  process.exit(0);
});

// Start monitoring
const monitor = new ProductionMonitor();
monitor.start().catch(console.error);

console.log('\n💡 Press Ctrl+C to stop monitoring');
console.log('📊 Updates every 10 seconds...');