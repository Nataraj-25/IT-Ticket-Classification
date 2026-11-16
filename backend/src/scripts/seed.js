/**
 * seed.js
 * Idempotent Database Seeding Script for Phase 1 Historical IT Tickets.
 * 
 * Features:
 * - Reads validated dataset from dataset/historical_tickets_cleaned.json
 * - Performs schema pre-validation
 * - Upserts records by ticket_id using bulkWrite
 * - Protects non-synthetic enterprise records from overwrite
 * - Tracks inserted, updated, and skipped counts
 * - Emits an AuditEvent documenting ingestion summary
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { connectDB, disconnectDB } = require('../config/db');
const { Ticket } = require('../models/Ticket');
const { AuditEvent } = require('../models/AuditEvent');

const runSeed = async () => {
  console.log('=====================================================');
  console.log('   IT Ticket Assistant - Historical Database Seeder   ');
  console.log('=====================================================');

  const datasetPath = path.resolve(__dirname, '../../../dataset/historical_tickets_cleaned.json');

  if (!fs.existsSync(datasetPath)) {
    console.error(`[Seed Error] Dataset file not found at: ${datasetPath}`);
    process.exit(1);
  }

  let rawData;
  try {
    rawData = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
  } catch (err) {
    console.error(`[Seed Error] Failed to parse JSON dataset: ${err.message}`);
    process.exit(1);
  }

  console.log(`[Seed] Loaded ${rawData.length} records from dataset.`);

  await connectDB();

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const rejected = [];

  const bulkOps = [];

  for (const record of rawData) {
    try {
      // Validate with Mongoose model validation rules
      const doc = new Ticket(record);
      const validationErr = doc.validateSync();

      if (validationErr) {
        rejected.push({
          ticket_id: record.ticket_id || 'UNKNOWN',
          errors: Object.values(validationErr.errors).map((e) => e.message)
        });
        continue;
      }

      // Check if ticket exists and belongs to enterprise/production source
      // Idempotent upsert only for synthetic records
      bulkOps.push({
        updateOne: {
          filter: {
            ticket_id: record.ticket_id,
            source_type: { $ne: 'production' } // Safety guard: never overwrite real production records
          },
          update: {
            $set: {
              ...record,
              created_at: new Date(record.created_at),
              resolved_at: record.resolved_at ? new Date(record.resolved_at) : null
            }
          },
          upsert: true
        }
      });
    } catch (err) {
      rejected.push({
        ticket_id: record.ticket_id,
        errors: [err.message]
      });
    }
  }

  if (bulkOps.length > 0) {
    console.log(`[Seed] Executing bulk write for ${bulkOps.length} valid tickets...`);
    const bulkResult = await Ticket.bulkWrite(bulkOps, { ordered: false });

    insertedCount = bulkResult.upsertedCount || 0;
    updatedCount = bulkResult.modifiedCount || 0;
    skippedCount = bulkOps.length - (insertedCount + updatedCount);

    console.log(`[Seed] BulkWrite Result:`);
    console.log(`   - Newly Inserted: ${insertedCount}`);
    console.log(`   - Updated/Refreshed: ${updatedCount}`);
    console.log(`   - Matched/Unchanged: ${skippedCount}`);
    console.log(`   - Rejected Invalid: ${rejected.length}`);
  }

  if (rejected.length > 0) {
    console.warn(`[Seed Warning] ${rejected.length} records were rejected during validation:`);
    rejected.slice(0, 5).forEach((r) => {
      console.warn(`   - ${r.ticket_id}: ${r.errors.join('; ')}`);
    });
  }

  // Record Audit Event for the seed operation
  const auditEvent = new AuditEvent({
    event_id: `EVT-SEED-${Date.now()}`,
    event_type: 'SEED_INGESTED',
    ticket_id: 'SYSTEM_BULK_SEED',
    actor_reference: {
      actor_id: 'seed_script',
      actor_type: 'seeder'
    },
    change_summary: {
      dataset_file: path.basename(datasetPath),
      total_processed: rawData.length,
      inserted: insertedCount,
      updated: updatedCount,
      skipped: skippedCount,
      rejected: rejected.length
    }
  });

  await auditEvent.save();
  console.log('[Seed] Audit event EVT-SEED logged successfully.');

  const totalInDb = await Ticket.countDocuments();
  console.log(`[Seed] Total tickets currently in MongoDB: ${totalInDb}`);

  await disconnectDB();
  console.log('[Seed] Seeding process completed successfully.');
};

if (require.main === module) {
  runSeed().catch((err) => {
    console.error(`[Seed Fatal Error]: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { runSeed };
