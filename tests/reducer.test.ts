import { describe, it, expect } from 'vitest';
import { stateReducer } from '../store/reducer';
import { INITIAL_STATE } from '../types';
import type { ScriptBlock } from '../types';

const BLOCK: ScriptBlock = {
  timecode: '00:00 - 00:10',
  visualCue: '[B-ROLL] Test',
  overlayFX: '',
  audioScript: 'Test audio script text here.',
  russianScript: '',
  blockType: 'BODY',
};

const BLOCK2: ScriptBlock = { ...BLOCK, audioScript: 'Second block.' };

describe('stateReducer', () => {
  it('SET_FIELD: updates a field on state', () => {
    const s = stateReducer(INITIAL_STATE, { type: 'SET_FIELD', field: 'topic', value: 'hello' });
    expect(s.topic).toBe('hello');
  });

  it('SET_FIELD: updating finalScript triggers pushUndo', () => {
    // Setup: state with an existing finalScript
    const withScript = stateReducer(INITIAL_STATE, { type: 'SET_FIELD', field: 'finalScript', value: [BLOCK] });
    expect(withScript.undoStack).toEqual([]); // first set: nothing to push

    // Set again: first finalScript becomes undoStack entry
    const withScript2 = stateReducer(withScript, { type: 'SET_FIELD', field: 'finalScript', value: [BLOCK2] });
    expect(withScript2.undoStack).toHaveLength(1);
    expect(withScript2.undoStack![0]).toEqual([BLOCK]);
    expect(withScript2.finalScript).toEqual([BLOCK2]);
  });

  it('ADD_LOG: appends message and respects MAX_LOG_ENTRIES', () => {
    let s = INITIAL_STATE;
    for (let i = 0; i < 5; i++) {
      s = stateReducer(s, { type: 'ADD_LOG', message: `msg ${i}` });
    }
    expect(s.logs).toHaveLength(5);
    expect(s.logs[4]).toBe('msg 4');
  });

  it('MERGE: merges partial state', () => {
    const s = stateReducer(INITIAL_STATE, { type: 'MERGE', partial: { topic: 'merged', isProcessing: true } });
    expect(s.topic).toBe('merged');
    expect(s.isProcessing).toBe(true);
  });

  it('UPDATE_SCRIPT_BLOCK: pushes undo and updates the block', () => {
    const withScript = { ...INITIAL_STATE, finalScript: [BLOCK, BLOCK2] };
    const s = stateReducer(withScript, { type: 'UPDATE_SCRIPT_BLOCK', index: 0, patch: { audioScript: 'Updated.' } });
    expect(s.finalScript![0].audioScript).toBe('Updated.');
    expect(s.undoStack).toHaveLength(1);
    expect(s.undoStack![0]).toEqual([BLOCK, BLOCK2]);
  });

  it('DELETE_SCRIPT_BLOCK: removes block and pushes undo', () => {
    const withScript = { ...INITIAL_STATE, finalScript: [BLOCK, BLOCK2] };
    const s = stateReducer(withScript, { type: 'DELETE_SCRIPT_BLOCK', index: 0 });
    expect(s.finalScript).toHaveLength(1);
    expect(s.finalScript![0]).toEqual(BLOCK2);
    expect(s.undoStack).toHaveLength(1);
  });

  it('ADD_SCRIPT_BLOCK: inserts new block after index and pushes undo', () => {
    const withScript = { ...INITIAL_STATE, finalScript: [BLOCK] };
    const s = stateReducer(withScript, { type: 'ADD_SCRIPT_BLOCK', index: 0 });
    expect(s.finalScript).toHaveLength(2);
    expect(s.finalScript![0]).toEqual(BLOCK);
    expect(s.finalScript![1].blockType).toBe('BODY');
    expect(s.undoStack).toHaveLength(1);
  });

  it('MOVE_SCRIPT_BLOCK: moves block and pushes undo', () => {
    const withScript = { ...INITIAL_STATE, finalScript: [BLOCK, BLOCK2] };
    const s = stateReducer(withScript, { type: 'MOVE_SCRIPT_BLOCK', from: 0, to: 1 });
    expect(s.finalScript![0]).toEqual(BLOCK2);
    expect(s.finalScript![1]).toEqual(BLOCK);
    expect(s.undoStack).toHaveLength(1);
  });

  it('UNDO_SCRIPT: restores previous script and pushes to redoStack', () => {
    const withScript = { ...INITIAL_STATE, finalScript: [BLOCK, BLOCK2] };
    const modified = stateReducer(withScript, { type: 'UPDATE_SCRIPT_BLOCK', index: 0, patch: { audioScript: 'Modified.' } });
    const undone = stateReducer(modified, { type: 'UNDO_SCRIPT' });
    expect(undone.finalScript).toEqual([BLOCK, BLOCK2]);
    expect(undone.undoStack).toHaveLength(0);
    expect(undone.redoStack).toHaveLength(1);
  });

  it('REDO_SCRIPT: restores next script from redoStack', () => {
    const withScript = { ...INITIAL_STATE, finalScript: [BLOCK, BLOCK2] };
    const modified = stateReducer(withScript, { type: 'UPDATE_SCRIPT_BLOCK', index: 0, patch: { audioScript: 'Modified.' } });
    const undone = stateReducer(modified, { type: 'UNDO_SCRIPT' });
    const redone = stateReducer(undone, { type: 'REDO_SCRIPT' });
    expect(redone.finalScript![0].audioScript).toBe('Modified.');
    expect(redone.redoStack).toHaveLength(0);
    expect(redone.undoStack).toHaveLength(1);
  });

  it('UNDO_SCRIPT: does nothing when undoStack is empty', () => {
    const s = stateReducer(INITIAL_STATE, { type: 'UNDO_SCRIPT' });
    expect(s).toBe(INITIAL_STATE);
  });

  it('REDO_SCRIPT: does nothing when redoStack is empty', () => {
    const s = stateReducer(INITIAL_STATE, { type: 'REDO_SCRIPT' });
    expect(s).toBe(INITIAL_STATE);
  });

  it('Undo stack is capped at 20 entries', () => {
    let s: typeof INITIAL_STATE = { ...INITIAL_STATE, finalScript: [BLOCK] };
    // Each UPDATE_SCRIPT_BLOCK pushes to undo
    for (let i = 0; i < 25; i++) {
      s = stateReducer(s, { type: 'UPDATE_SCRIPT_BLOCK', index: 0, patch: { audioScript: `Version ${i}` } });
    }
    expect(s.undoStack!.length).toBeLessThanOrEqual(20);
  });
});
