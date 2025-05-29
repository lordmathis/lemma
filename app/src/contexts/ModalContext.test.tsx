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

describe('ModalContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ModalProvider', () => {
    it('provides modal context with initial false values', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useModalContext(), { wrapper });

      expect(result.current.newFileModalVisible).toBe(false);
      expect(result.current.deleteFileModalVisible).toBe(false);
      expect(result.current.commitMessageModalVisible).toBe(false);
      expect(result.current.settingsModalVisible).toBe(false);
      expect(result.current.switchWorkspaceModalVisible).toBe(false);
      expect(result.current.createWorkspaceModalVisible).toBe(false);
    });

    it('provides all setter functions', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useModalContext(), { wrapper });

      expect(typeof result.current.setNewFileModalVisible).toBe('function');
      expect(typeof result.current.setDeleteFileModalVisible).toBe('function');
      expect(typeof result.current.setCommitMessageModalVisible).toBe(
        'function'
      );
      expect(typeof result.current.setSettingsModalVisible).toBe('function');
      expect(typeof result.current.setSwitchWorkspaceModalVisible).toBe(
        'function'
      );
      expect(typeof result.current.setCreateWorkspaceModalVisible).toBe(
        'function'
      );
    });

    it('provides complete context interface', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useModalContext(), { wrapper });

      const expectedKeys = [
        'newFileModalVisible',
        'setNewFileModalVisible',
        'deleteFileModalVisible',
        'setDeleteFileModalVisible',
        'commitMessageModalVisible',
        'setCommitMessageModalVisible',
        'settingsModalVisible',
        'setSettingsModalVisible',
        'switchWorkspaceModalVisible',
        'setSwitchWorkspaceModalVisible',
        'createWorkspaceModalVisible',
        'setCreateWorkspaceModalVisible',
      ];

      expectedKeys.forEach((key) => {
        expect(key in result.current).toBe(true);
      });
    });
  });

  describe('useModalContext hook', () => {
    it('throws error when used outside ModalProvider', () => {
      // Suppress console.error for this test since we expect an error
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useModalContext());
      }).toThrow('useModalContext must be used within a ModalProvider');

      consoleSpy.mockRestore();
    });

    it('returns modal context when used within provider', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useModalContext(), { wrapper });

      expect(result.current).toBeDefined();
      expect(typeof result.current).toBe('object');
    });

    it('maintains function stability across re-renders', () => {
      const wrapper = createWrapper();
      const { result, rerender } = renderHook(() => useModalContext(), {
        wrapper,
      });

      const initialSetters = {
        setNewFileModalVisible: result.current.setNewFileModalVisible,
        setDeleteFileModalVisible: result.current.setDeleteFileModalVisible,
        setCommitMessageModalVisible:
          result.current.setCommitMessageModalVisible,
        setSettingsModalVisible: result.current.setSettingsModalVisible,
        setSwitchWorkspaceModalVisible:
          result.current.setSwitchWorkspaceModalVisible,
        setCreateWorkspaceModalVisible:
          result.current.setCreateWorkspaceModalVisible,
      };

      rerender();

      expect(result.current.setNewFileModalVisible).toBe(
        initialSetters.setNewFileModalVisible
      );
      expect(result.current.setDeleteFileModalVisible).toBe(
        initialSetters.setDeleteFileModalVisible
      );
      expect(result.current.setCommitMessageModalVisible).toBe(
        initialSetters.setCommitMessageModalVisible
      );
      expect(result.current.setSettingsModalVisible).toBe(
        initialSetters.setSettingsModalVisible
      );
      expect(result.current.setSwitchWorkspaceModalVisible).toBe(
        initialSetters.setSwitchWorkspaceModalVisible
      );
      expect(result.current.setCreateWorkspaceModalVisible).toBe(
        initialSetters.setCreateWorkspaceModalVisible
      );
    });
  });

  describe('modal state management', () => {
    describe('newFileModalVisible', () => {
      it('can be set to true', () => {
        const wrapper = createWrapper();
        const { result } = renderHook(() => useModalContext(), { wrapper });

        act(() => {
          result.current.setNewFileModalVisible(true);
        });

        expect(result.current.newFileModalVisible).toBe(true);
      });

      it('can be toggled back to false', () => {
        const wrapper = createWrapper();
        const { result } = renderHook(() => useModalContext(), { wrapper });

        act(() => {
          result.current.setNewFileModalVisible(true);
        });

        act(() => {
          result.current.setNewFileModalVisible(false);
        });

        expect(result.current.newFileModalVisible).toBe(false);
      });

      it('can be toggled multiple times', () => {
        const wrapper = createWrapper();
        const { result } = renderHook(() => useModalContext(), { wrapper });

        act(() => {
          result.current.setNewFileModalVisible(true);
        });
        expect(result.current.newFileModalVisible).toBe(true);

        act(() => {
          result.current.setNewFileModalVisible(false);
        });
        expect(result.current.newFileModalVisible).toBe(false);

        act(() => {
          result.current.setNewFileModalVisible(true);
        });
        expect(result.current.newFileModalVisible).toBe(true);
      });
    });

    describe('deleteFileModalVisible', () => {
      it('can be set to true', () => {
        const wrapper = createWrapper();
        const { result } = renderHook(() => useModalContext(), { wrapper });

        act(() => {
          result.current.setDeleteFileModalVisible(true);
        });

        expect(result.current.deleteFileModalVisible).toBe(true);
      });

      it('can be toggled back to false', () => {
        const wrapper = createWrapper();
        const { result } = renderHook(() => useModalContext(), { wrapper });

        act(() => {
          result.current.setDeleteFileModalVisible(true);
        });

        act(() => {
          result.current.setDeleteFileModalVisible(false);
        });

        expect(result.current.deleteFileModalVisible).toBe(false);
      });
    });

    describe('commitMessageModalVisible', () => {
      it('can be set to true', () => {
        const wrapper = createWrapper();
        const { result } = renderHook(() => useModalContext(), { wrapper });

        act(() => {
          result.current.setCommitMessageModalVisible(true);
        });

        expect(result.current.commitMessageModalVisible).toBe(true);
      });

      it('can be toggled back to false', () => {
        const wrapper = createWrapper();
        const { result } = renderHook(() => useModalContext(), { wrapper });

        act(() => {
          result.current.setCommitMessageModalVisible(true);
        });

        act(() => {
          result.current.setCommitMessageModalVisible(false);
        });

        expect(result.current.commitMessageModalVisible).toBe(false);
      });
    });

    describe('settingsModalVisible', () => {
      it('can be set to true', () => {
        const wrapper = createWrapper();
        const { result } = renderHook(() => useModalContext(), { wrapper });

        act(() => {
          result.current.setSettingsModalVisible(true);
        });

        expect(result.current.settingsModalVisible).toBe(true);
      });

      it('can be toggled back to false', () => {
        const wrapper = createWrapper();
        const { result } = renderHook(() => useModalContext(), { wrapper });

        act(() => {
          result.current.setSettingsModalVisible(true);
        });

        act(() => {
          result.current.setSettingsModalVisible(false);
        });

        expect(result.current.settingsModalVisible).toBe(false);
      });
    });

    describe('switchWorkspaceModalVisible', () => {
      it('can be set to true', () => {
        const wrapper = createWrapper();
        const { result } = renderHook(() => useModalContext(), { wrapper });

        act(() => {
          result.current.setSwitchWorkspaceModalVisible(true);
        });

        expect(result.current.switchWorkspaceModalVisible).toBe(true);
      });

      it('can be toggled back to false', () => {
        const wrapper = createWrapper();
        const { result } = renderHook(() => useModalContext(), { wrapper });

        act(() => {
          result.current.setSwitchWorkspaceModalVisible(true);
        });

        act(() => {
          result.current.setSwitchWorkspaceModalVisible(false);
        });

        expect(result.current.switchWorkspaceModalVisible).toBe(false);
      });
    });

    describe('createWorkspaceModalVisible', () => {
      it('can be set to true', () => {
        const wrapper = createWrapper();
        const { result } = renderHook(() => useModalContext(), { wrapper });

        act(() => {
          result.current.setCreateWorkspaceModalVisible(true);
        });

        expect(result.current.createWorkspaceModalVisible).toBe(true);
      });

      it('can be toggled back to false', () => {
        const wrapper = createWrapper();
        const { result } = renderHook(() => useModalContext(), { wrapper });

        act(() => {
          result.current.setCreateWorkspaceModalVisible(true);
        });

        act(() => {
          result.current.setCreateWorkspaceModalVisible(false);
        });

        expect(result.current.createWorkspaceModalVisible).toBe(false);
      });
    });
  });

  describe('independent modal state', () => {
    it('each modal state is independent', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useModalContext(), { wrapper });

      // Set multiple modals to true
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

      // Set all modals to true first
      act(() => {
        result.current.setNewFileModalVisible(true);
        result.current.setDeleteFileModalVisible(true);
        result.current.setCommitMessageModalVisible(true);
        result.current.setSettingsModalVisible(true);
        result.current.setSwitchWorkspaceModalVisible(true);
        result.current.setCreateWorkspaceModalVisible(true);
      });

      // Toggle one modal off
      act(() => {
        result.current.setNewFileModalVisible(false);
      });

      expect(result.current.newFileModalVisible).toBe(false);
      expect(result.current.deleteFileModalVisible).toBe(true);
      expect(result.current.commitMessageModalVisible).toBe(true);
      expect(result.current.settingsModalVisible).toBe(true);
      expect(result.current.switchWorkspaceModalVisible).toBe(true);
      expect(result.current.createWorkspaceModalVisible).toBe(true);
    });
  });

  describe('useState setter function behavior', () => {
    it('handles function updater pattern', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useModalContext(), { wrapper });

      // Test function updater for toggling
      act(() => {
        result.current.setNewFileModalVisible((prev) => !prev);
      });

      expect(result.current.newFileModalVisible).toBe(true);

      act(() => {
        result.current.setNewFileModalVisible((prev) => !prev);
      });

      expect(result.current.newFileModalVisible).toBe(false);
    });

    it('handles conditional updates with function updater', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useModalContext(), { wrapper });

      // Set to true first
      act(() => {
        result.current.setSettingsModalVisible(true);
      });

      // Use function updater with condition
      act(() => {
        result.current.setSettingsModalVisible((prev) => (prev ? false : true));
      });

      expect(result.current.settingsModalVisible).toBe(false);
    });

    it('supports multiple rapid state updates', () => {
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

  describe('context value structure', () => {
    it('provides expected context interface', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useModalContext(), { wrapper });

      const expectedBooleanValues = {
        newFileModalVisible: false,
        deleteFileModalVisible: false,
        commitMessageModalVisible: false,
        settingsModalVisible: false,
        switchWorkspaceModalVisible: false,
        createWorkspaceModalVisible: false,
      };

      // Check the boolean values
      Object.entries(expectedBooleanValues).forEach(([key, value]) => {
        expect(result.current[key as keyof typeof result.current]).toBe(value);
      });

      // Check the setter functions exist
      expect(typeof result.current.setNewFileModalVisible).toBe('function');
      expect(typeof result.current.setDeleteFileModalVisible).toBe('function');
      expect(typeof result.current.setCommitMessageModalVisible).toBe(
        'function'
      );
      expect(typeof result.current.setSettingsModalVisible).toBe('function');
      expect(typeof result.current.setSwitchWorkspaceModalVisible).toBe(
        'function'
      );
      expect(typeof result.current.setCreateWorkspaceModalVisible).toBe(
        'function'
      );
    });

    it('all boolean values have correct types', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useModalContext(), { wrapper });

      expect(typeof result.current.newFileModalVisible).toBe('boolean');
      expect(typeof result.current.deleteFileModalVisible).toBe('boolean');
      expect(typeof result.current.commitMessageModalVisible).toBe('boolean');
      expect(typeof result.current.settingsModalVisible).toBe('boolean');
      expect(typeof result.current.switchWorkspaceModalVisible).toBe('boolean');
      expect(typeof result.current.createWorkspaceModalVisible).toBe('boolean');
    });

    it('all setter functions have correct types', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useModalContext(), { wrapper });

      expect(typeof result.current.setNewFileModalVisible).toBe('function');
      expect(typeof result.current.setDeleteFileModalVisible).toBe('function');
      expect(typeof result.current.setCommitMessageModalVisible).toBe(
        'function'
      );
      expect(typeof result.current.setSettingsModalVisible).toBe('function');
      expect(typeof result.current.setSwitchWorkspaceModalVisible).toBe(
        'function'
      );
      expect(typeof result.current.setCreateWorkspaceModalVisible).toBe(
        'function'
      );
    });
  });

  describe('performance considerations', () => {
    it('does not cause unnecessary re-renders', () => {
      const wrapper = createWrapper();
      const { result, rerender } = renderHook(() => useModalContext(), {
        wrapper,
      });

      const initialContext = result.current;

      // Re-render without changing anything
      rerender();

      // All function references should be stable
      expect(result.current.setNewFileModalVisible).toBe(
        initialContext.setNewFileModalVisible
      );
      expect(result.current.setDeleteFileModalVisible).toBe(
        initialContext.setDeleteFileModalVisible
      );
      expect(result.current.setCommitMessageModalVisible).toBe(
        initialContext.setCommitMessageModalVisible
      );
      expect(result.current.setSettingsModalVisible).toBe(
        initialContext.setSettingsModalVisible
      );
      expect(result.current.setSwitchWorkspaceModalVisible).toBe(
        initialContext.setSwitchWorkspaceModalVisible
      );
      expect(result.current.setCreateWorkspaceModalVisible).toBe(
        initialContext.setCreateWorkspaceModalVisible
      );
    });

    it('maintains setter function stability after state changes', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useModalContext(), { wrapper });

      const initialSetters = {
        setNewFileModalVisible: result.current.setNewFileModalVisible,
        setDeleteFileModalVisible: result.current.setDeleteFileModalVisible,
      };

      // Change some state
      act(() => {
        result.current.setNewFileModalVisible(true);
        result.current.setDeleteFileModalVisible(true);
      });

      // Function references should still be the same
      expect(result.current.setNewFileModalVisible).toBe(
        initialSetters.setNewFileModalVisible
      );
      expect(result.current.setDeleteFileModalVisible).toBe(
        initialSetters.setDeleteFileModalVisible
      );
    });
  });

  describe('real-world usage patterns', () => {
    it('supports common modal workflow patterns', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useModalContext(), { wrapper });

      // Typical workflow: open modal, perform action, close modal
      act(() => {
        result.current.setNewFileModalVisible(true);
      });

      expect(result.current.newFileModalVisible).toBe(true);

      // User performs action (file creation), then modal closes
      act(() => {
        result.current.setNewFileModalVisible(false);
      });

      expect(result.current.newFileModalVisible).toBe(false);
    });

    it('supports opening multiple modals in sequence', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useModalContext(), { wrapper });

      // Open new file modal
      act(() => {
        result.current.setNewFileModalVisible(true);
      });

      // Close new file modal, open settings
      act(() => {
        result.current.setNewFileModalVisible(false);
        result.current.setSettingsModalVisible(true);
      });

      expect(result.current.newFileModalVisible).toBe(false);
      expect(result.current.settingsModalVisible).toBe(true);

      // Close settings, open workspace creation
      act(() => {
        result.current.setSettingsModalVisible(false);
        result.current.setCreateWorkspaceModalVisible(true);
      });

      expect(result.current.settingsModalVisible).toBe(false);
      expect(result.current.createWorkspaceModalVisible).toBe(true);
    });

    it('supports modal state reset pattern', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useModalContext(), { wrapper });

      // Open multiple modals
      act(() => {
        result.current.setNewFileModalVisible(true);
        result.current.setSettingsModalVisible(true);
        result.current.setDeleteFileModalVisible(true);
      });

      // Reset all to false (like on route change or logout)
      act(() => {
        result.current.setNewFileModalVisible(false);
        result.current.setSettingsModalVisible(false);
        result.current.setDeleteFileModalVisible(false);
        result.current.setCommitMessageModalVisible(false);
        result.current.setSwitchWorkspaceModalVisible(false);
        result.current.setCreateWorkspaceModalVisible(false);
      });

      expect(result.current.newFileModalVisible).toBe(false);
      expect(result.current.settingsModalVisible).toBe(false);
      expect(result.current.deleteFileModalVisible).toBe(false);
      expect(result.current.commitMessageModalVisible).toBe(false);
      expect(result.current.switchWorkspaceModalVisible).toBe(false);
      expect(result.current.createWorkspaceModalVisible).toBe(false);
    });
  });
});
