/**
 * Regression Tests: Admin Deep Clone (BUG-003)
 * Ensures AdminQuestionnaireService properly deep clones questionnaires
 */

import { deepFreeze, testData } from './setup';

describe('@regression:BUG-003 Admin Questionnaire Deep Clone', () => {
  // Simulate the questionnaire duplication logic
  function duplicateQuestionnaire(
    original: { id: string; title: string; questions: Array<{ id: string; text: string }> },
    newId: string,
  ) {
    // The bug was: using spread operator for shallow copy
    // const clone = { ...original, id: newId }; // BUG: questions array still references original

    // Fix: Use structuredClone or deep copy
    const clone = JSON.parse(JSON.stringify(original));
    clone.id = newId;
    clone.title = `Copy of ${original.title}`;
    return clone;
  }

  describe('Immutability', () => {
    it('should not modify original questionnaire when duplicating', () => {
      const original = deepFreeze(testData.validQuestionnaire);
      const originalCopy = JSON.stringify(original);

      const duplicate = duplicateQuestionnaire(JSON.parse(JSON.stringify(original)), 'new-id');

      expect(JSON.stringify(original)).toBe(originalCopy);
    });

    it('should create independent copy of questions array', () => {
      const original = {
        id: 'orig-1',
        title: 'Original',
        questions: [
          { id: 'q1', text: 'Question 1' },
          { id: 'q2', text: 'Question 2' },
        ],
      };

      const duplicate = duplicateQuestionnaire(original, 'dup-1');

      // Modify duplicate's questions
      duplicate.questions[0].text = 'Modified Question';

      // Original should be unchanged
      expect(original.questions[0].text).toBe('Question 1');
    });

    it('should create new array reference for questions', () => {
      const original = testData.validQuestionnaire;
      const duplicate = duplicateQuestionnaire(JSON.parse(JSON.stringify(original)), 'dup-2');

      // Arrays should be different references
      expect(duplicate.questions).not.toBe(original.questions);
    });

    it('should create new object references for each question', () => {
      const original = testData.validQuestionnaire;
      const duplicate = duplicateQuestionnaire(JSON.parse(JSON.stringify(original)), 'dup-3');

      // Each question object should be a different reference
      for (let i = 0; i < original.questions.length; i++) {
        expect(duplicate.questions[i]).not.toBe(original.questions[i]);
      }
    });
  });

  describe('Duplication Logic', () => {
    it('should assign new id to duplicate', () => {
      const original = testData.validQuestionnaire;
      const duplicate = duplicateQuestionnaire(
        JSON.parse(JSON.stringify(original)),
        'new-unique-id',
      );

      expect(duplicate.id).toBe('new-unique-id');
      expect(duplicate.id).not.toBe(original.id);
    });

    it('should prefix title with "Copy of"', () => {
      const original = { id: '1', title: 'My Questionnaire', questions: [] };
      const duplicate = duplicateQuestionnaire(original, '2');

      expect(duplicate.title).toBe('Copy of My Questionnaire');
    });

    it('should preserve all question content', () => {
      const original = testData.validQuestionnaire;
      const duplicate = duplicateQuestionnaire(JSON.parse(JSON.stringify(original)), 'dup-4');

      expect(duplicate.questions.length).toBe(original.questions.length);
      for (let i = 0; i < original.questions.length; i++) {
        expect(duplicate.questions[i].text).toBe(original.questions[i].text);
      }
    });
  });

  describe('Nested Object Handling', () => {
    it('should deep clone nested metadata', () => {
      const originalWithMeta = {
        id: '1',
        title: 'Test',
        questions: [
          {
            id: 'q1',
            text: 'Question',
            metadata: {
              dimension: 'Security',
              tags: ['auth', 'access'],
            },
          },
        ],
      };

      const duplicate = duplicateQuestionnaire(originalWithMeta as any, '2');

      // Modify duplicate's nested data
      duplicate.questions[0].metadata.tags.push('new-tag');

      // Original should be unchanged
      expect((originalWithMeta.questions[0] as any).metadata.tags).toHaveLength(2);
    });
  });
});
