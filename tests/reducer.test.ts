import { describe, it, expect } from 'vitest';
import { stateReducer } from '../store/reducer';
import { INITIAL_STATE } from '../types';
import type { SystemState, ScriptBlock } from '../types';
import { MAX_LOG_ENTRIES } from '../constants';

const makeBlock = (overrides: Partial<ScriptBlock> = {}): ScriptBlock => ({
  timecode: '00:00 - 00:30',
  visualCue: 'Test visual',
  overlayFX: '',
  audioScript: 'Test audio script text here',
  russianScript: '',
  blockType: 'BODY',
  ...overrides,
});

const stateWithScript = (): SystemState => ({
  ...INITIAL_STATE,
  finalScript: [
    makeBlock({ blockType: 'HOOK', audioScript: 'Hook text' }),
    makeBlock({ blockType: 'BODY', audioScript: 'Body text' }),
    makeBlock({ blockType: 'OUTRO', audioScript: 'Outro text' }),
  ],
});

describe('stateReducer', () => {
  describe('SET_FIELD', () => {
    it('sets a scalar field', () => {
      const next = stateReducer(INITIAL_STATE, { type: 'SET_FIELD', field: 'topic', value: 'Test Topic' });
      expect(next.topic).toBe('Test Topic');
    });

    it('sets isProcessing to true', () => {
      const next = stateReducer(INITIAL_STATE, { type: 'SET_FIELD', field: 'isProcessing', value: true });
      expect(next.isProcessing).toBe(true);
    });

    it('does not mutate other fields', () => {
      const next = stateReducer(INITIAL_STATE, { type: 'SET_FIELD', field: 'topic', value: 'X' });
      expect(next.isProcessing).toBe(INITIAL_STATE.isProcessing);
      expect(next.logs).toBe(INITIAL_STATE.logs);
    });
  });

  describe('ADD_LOG', () => {
    it('appends a log message', () => {
      const next = stateReducer(INITIAL_STATE, { type: 'ADD_LOG', message: '>>> TEST' });
      expect(next.logs[next.logs.length - 1]).toBe('>>> TEST');
      expect(next.logs.length).toBe(INITIAL_STATE.logs.length + 1);
    });

    it('truncates logs when exceeding MAX_LOG_ENTRIES', () => {
      const overflowState: SystemState = {
        ...INITIAL_STATE,
        logs: Array.from({ length: MAX_LOG_ENTRIES }, (_, i) => `log ${i}`),
      };
      const next = stateReducer(overflowState, { type: 'ADD_LOG', message: 'new entry' });
      expect(next.logs.length).toBe(MAX_LOG_ENTRIES);
      expect(next.logs[next.logs.length - 1]).toBe('new entry');
    });
  });

  describe('MERGE', () => {
    it('merges partial state', () => {
      const next = stateReducer(INITIAL_STATE, {
        type: 'MERGE',
        partial: { topic: 'merged', isProcessing: true },
      });
      expect(next.topic).toBe('merged');
      expect(next.isProcessing).toBe(true);
      expect(next.logs).toBe(INITIAL_STATE.logs);
    });
  });

  describe('UPDATE_SCRIPT_IMAGE', () => {
    it('updates imageUrl on the correct block', () => {
      const state = stateWithScript();
      const next = stateReducer(state, { type: 'UPDATE_SCRIPT_IMAGE', index: 1, imageUrl: 'data:image/png;base64,abc' });
      expect(next.finalScript![1].imageUrl).toBe('data:image/png;base64,abc');
      expect(next.finalScript![0].imageUrl).toBeUndefined();
    });

    it('returns unchanged state when finalScript is absent', () => {
      const next = stateReducer(INITIAL_STATE, { type: 'UPDATE_SCRIPT_IMAGE', index: 0, imageUrl: 'x' });
      expect(next).toBe(INITIAL_STATE);
    });
  });

  describe('SET_HISTORY', () => {
    it('replaces history array', () => {
      const fakeHistory = [{ id: 1, created_at: '', topic: 'T', model: 'm', script: [] }];
      const next = stateReducer(INITIAL_STATE, { type: 'SET_HISTORY', history: fakeHistory });
      expect(next.history).toEqual(fakeHistory);
    });
  });

  describe('UPDATE_SCRIPT_BLOCK', () => {
    it('patches the specified block and pushes undo', () => {
      const state = stateWithScript();
      const next = stateReducer(state, {
        type: 'UPDATE_SCRIPT_BLOCK',
        index: 0,
        patch: { audioScript: 'Updated hook' },
      });
      expect(next.finalScript![0].audioScript).toBe('Updated hook');
      expect(next.finalScript![0].blockType).toBe('HOOK'); // unchanged field preserved
      expect(next.undoStack?.length).toBe(1);
      expect(next.redoStack).toEqual([]);
    });

    it('does not mutate the original script array', () => {
      const state = stateWithScript();
      const orig = state.finalScript!.map(b => ({ ...b }));
      stateReducer(state, { type: 'UPDATE_SCRIPT_BLOCK', index: 0, patch: { audioScript: 'X' } });
      expect(state.finalScript![0].audioScript).toBe(orig[0].audioScript);
    });
  });

  describe('DELETE_SCRIPT_BLOCK', () => {
    it('removes the block at the given index', () => {
      const state = stateWithScript();
      const next = stateReducer(state, { type: 'DELETE_SCRIPT_BLOCK', index: 1 });
      expect(next.finalScript!.length).toBe(2);
      expect(next.finalScript![0].blockType).toBe('HOOK');
      expect(next.finalScript![1].blockType).toBe('OUTRO');
    });

    it('pushes to undo stack', () => {
      const state = stateWithScript();
      const next = stateReducer(state, { type: 'DELETE_SCRIPT_BLOCK', index: 0 });
      expect(next.undoStack?.length).toBe(1);
    });

    it('returns unchanged state when no script', () => {
      const next = stateReducer(INITIAL_STATE, { type: 'DELETE_SCRIPT_BLOCK', index: 0 });
      expect(next).toBe(INITIAL_STATE);
    });
  });

  describe('ADD_SCRIPT_BLOCK', () => {
    it('inserts a new BODY block after the given index', () => {
      const state = stateWithScript();
      const next = stateReducer(state, { type: 'ADD_SCRIPT_BLOCK', index: 0 });
      expect(next.finalScript!.length).toBe(4);
      expect(next.finalScript![1].blockType).toBe('BODY');
      expect(next.finalScript![1].audioScript).toBe('');
      expect(next.finalScript![0].blockType).toBe('HOOK'); // original first block preserved
    });

    it('pushes to undo stack', () => {
      const state = stateWithScript();
      const next = stateReducer(state, { type: 'ADD_SCRIPT_BLOCK', index: 0 });
      expect(next.undoStack?.length).toBe(1);
    });
  });

  describe('MOVE_SCRIPT_BLOCK', () => {
    it('moves a block from one position to another', () => {
      const state = stateWithScript();
      // Move OUTRO (index 2) to front (index 0)
      const next = stateReducer(state, { type: 'MOVE_SCRIPT_BLOCK', from: 2, to: 0 });
      expect(next.finalScript![0].blockType).toBe('OUTRO');
      expect(next.finalScript![1].blockType).toBe('HOOK');
      expect(next.finalScript![2].blockType).toBe('BODY');
    });

    it('pushes to undo stack', () => {
      const state = stateWithScript();
      const next = stateReducer(state, { type: 'MOVE_SCRIPT_BLOCK', from: 0, to: 2 });
      expect(next.undoStack?.length).toBe(1);
    });
  });

  describe('UNDO_SCRIPT / REDO_SCRIPT', () => {
    it('UNDO restores the previous script', () => {
      const state = stateWithScript();
      // Make a change to push undo
      const afterEdit = stateReducer(state, {
        type: 'UPDATE_SCRIPT_BLOCK',
        index: 0,
        patch: { audioScript: 'edited' },
      });
      expect(afterEdit.finalScript![0].audioScript).toBe('edited');

      const afterUndo = stateReducer(afterEdit, { type: 'UNDO_SCRIPT' });
      expect(afterUndo.finalScript![0].audioScript).toBe('Hook text');
      expect(afterUndo.undoStack?.length).toBe(0);
      expect(afterUndo.redoStack?.length).toBe(1);
    });

    it('REDO restores the undone script', () => {
      const state = stateWithScript();
      const afterEdit = stateReducer(state, {
        type: 'UPDATE_SCRIPT_BLOCK',
        index: 0,
        patch: { audioScript: 'edited' },
      });
      const afterUndo = stateReducer(afterEdit, { type: 'UNDO_SCRIPT' });
      const afterRedo = stateReducer(afterUndo, { type: 'REDO_SCRIPT' });
      expect(afterRedo.finalScript![0].audioScript).toBe('edited');
      expect(afterRedo.redoStack?.length).toBe(0);
      expect(afterRedo.undoStack?.length).toBe(1);
    });

    it('UNDO with empty stack returns unchanged state', () => {
      const next = stateReducer(INITIAL_STATE, { type: 'UNDO_SCRIPT' });
      expect(next).toBe(INITIAL_STATE);
    });

    it('REDO with empty stack returns unchanged state', () => {
      const next = stateReducer(INITIAL_STATE, { type: 'REDO_SCRIPT' });
      expect(next).toBe(INITIAL_STATE);
    });

    it('caps undo stack at 20 entries', () => {
      let s = stateWithScript();
      for (let i = 0; i < 22; i++) {
        s = stateReducer(s, {
          type: 'UPDATE_SCRIPT_BLOCK',
          index: 0,
          patch: { audioScript: `edit ${i}` },
        });
      }
      expect(s.undoStack!.length).toBeLessThanOrEqual(20);
    });
  });
});
