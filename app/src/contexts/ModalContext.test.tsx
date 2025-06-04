import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ModalProvider, useModalContext } from './ModalContext';

// Helper wrapper component for testing
const createWrapper = () => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ModalProvider>{children}</ModalProvider>
  );
  Wrapper.displayName = 'ModalProviderTestWrapper';
  return Wrapper;
};

// Modal field pairs for parameterized testing
const modalFieldPairs = [
  { field: 'newFileModalVisible', setter: 'setNewFileModalVisible' },
  { field: 'deleteFileModalVisible', setter: 'setDeleteFileModalVisible' },
  {
    field: 'commitMessageModalVisible',
    setter: 'setCommitMessageModalVisible',
  },
  { field: 'settingsModalVisible', setter: 'setSettingsModalVisible' },
  {
    field: 'switchWorkspaceModalVisible',
    setter: 'setSwitchWorkspaceModalVisible',
  },
  {
    field: 'createWorkspaceModalVisible',
    setter: 'setCreateWorkspaceModalVisible',
  },
] as const;

describe('ModalContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ModalProvider', () => {
    it('provides modal context with initial false values and all setter functions', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useModalContext(), { wrapper });

      // All modal states should be false initially and setters should be functions
      modalFieldPairs.forEach(({ field, setter }) => {
        expect(result.current[field]).toBe(false);
        expect(typeof result.current[setter]).toBe('function');
      });
    });

    it('maintains function stability across re-renders', () => {
      const wrapper = createWrapper();
      const { result, rerender } = renderHook(() => useModalContext(), {
        wrapper,
      });

      const initialSetters = modalFieldPairs.map(
        ({ setter }) => result.current[setter]
      );

      rerender();

      modalFieldPairs.forEach(({ setter }, index) => {
        expect(result.current[setter]).toBe(initialSetters[index]);
      });
    });
  });

  describe('useModalContext hook', () => {
    it('throws error when used outside ModalProvider', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useModalContext());
      }).toThrow('useModalContext must be used within a ModalProvider');

      consoleSpy.mockRestore();
    });

    it('returns complete context interface', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useModalContext(), { wrapper });

      modalFieldPairs.forEach(({ field, setter }) => {
        expect(field in result.current).toBe(true);
        expect(setter in result.current).toBe(true);
      });
    });
  });

  describe('modal state management', () => {
    // Test all modals with the same pattern using parameterized tests
    modalFieldPairs.forEach(({ field, setter }) => {
      describe(field, () => {
        it('can be toggled true and false', () => {
          const wrapper = createWrapper();
          const { result } = renderHook(() => useModalContext(), { wrapper });

          // Set to true
          act(() => {
            result.current[setter](true);
          });
          expect(result.current[field]).toBe(true);

          // Set to false
          act(() => {
            result.current[setter](false);
          });
          expect(result.current[field]).toBe(false);
        });

        it('supports function updater pattern', () => {
          const wrapper = createWrapper();
          const { result } = renderHook(() => useModalContext(), { wrapper });

          // Toggle using function updater
          act(() => {
            result.current[setter]((prev) => !prev);
          });
          expect(result.current[field]).toBe(true);

          act(() => {
            result.current[setter]((prev) => !prev);
          });
          expect(result.current[field]).toBe(false);
        });
      });
    });

    it('each modal state is independent', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useModalContext(), { wrapper });

      // Set first three modals to true
      act(() => {
        result.current.setNewFileModalVisible(true);
        result.current.setDeleteFileModalVisible(true);
        result.current.setSettingsModalVisible(true);
      });

      expect(result.current.newFileModalVisible).toBe(true);
      expect(result.current.deleteFileModalVisible).toBe(true);
      expect(result.current.settingsModalVisible).toBe(true);
      expect(result.current.commitMessageModalVisible).toBe(false);
      expect(result.current.switchWorkspaceModalVisible).toBe(false);
      expect(result.current.createWorkspaceModalVisible).toBe(false);
    });

    it('setting one modal does not affect others', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useModalContext(), { wrapper });

      // Set all modals to true
      act(() => {
        modalFieldPairs.forEach(({ setter }) => {
          result.current[setter](true);
        });
      });

      // Toggle one modal off
      act(() => {
        result.current.setNewFileModalVisible(false);
      });

      expect(result.current.newFileModalVisible).toBe(false);
      // All others should remain true
      modalFieldPairs.slice(1).forEach(({ field }) => {
        expect(result.current[field]).toBe(true);
      });
    });

    it('supports rapid state updates', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useModalContext(), { wrapper });

      act(() => {
        result.current.setNewFileModalVisible(true);
        result.current.setNewFileModalVisible(false);
        result.current.setNewFileModalVisible(true);
      });

      expect(result.current.newFileModalVisible).toBe(true);
    });
  });

  describe('provider nesting', () => {
    it('inner provider creates independent context', () => {
      const OuterWrapper = ({ children }: { children: React.ReactNode }) => (
        <ModalProvider>{children}</ModalProvider>
      );

      const InnerWrapper = ({ children }: { children: React.ReactNode }) => (
        <OuterWrapper>
          <ModalProvider>{children}</ModalProvider>
        </OuterWrapper>
      );

      const { result } = renderHook(() => useModalContext(), {
        wrapper: InnerWrapper,
      });

      // Should work with nested providers (inner context takes precedence)
      expect(result.current.newFileModalVisible).toBe(false);

      act(() => {
        result.current.setNewFileModalVisible(true);
      });

      expect(result.current.newFileModalVisible).toBe(true);
    });
  });
});
