'use strict';
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g = Object.create((typeof Iterator === 'function' ? Iterator : Object).prototype);
    return (
      (g.next = verb(0)),
      (g['throw'] = verb(1)),
      (g['return'] = verb(2)),
      typeof Symbol === 'function' &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError('Generator is already executing.');
      while ((g && ((g = 0), op[0] && (_ = 0)), _))
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y['return']
                  : op[0]
                    ? y['throw'] || ((t = y['return']) && t.call(y), 0)
                    : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
Object.defineProperty(exports, '__esModule', { value: true });
var api_client_1 = require('../api-client');
var axios_1 = require('axios');
jest.mock('axios');
jest.mock('../config');
describe('ApiClient', function () {
  var mockConfig;
  var apiClient;
  var mockAxiosInstance;
  beforeEach(function () {
    jest.clearAllMocks();
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };
    axios_1.default.create.mockReturnValue(mockAxiosInstance);
    mockConfig = {
      get: jest.fn(function (key) {
        if (key === 'apiUrl') {
          return 'http://localhost:3000/api';
        }
        if (key === 'apiToken') {
          return 'test-token-123';
        }
        return '';
      }),
    };
    apiClient = new api_client_1.ApiClient(mockConfig);
  });
  describe('constructor', function () {
    it('creates axios instance with correct base URL', function () {
      expect(axios_1.default.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3000/api',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token-123',
        },
        timeout: 30000,
      });
    });
    it('creates axios instance without auth header when no token', function () {
      mockConfig.get.mockReturnValue('');
      new api_client_1.ApiClient(mockConfig);
      expect(axios_1.default.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3000/api',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
    });
    it('uses default URL when apiUrl not configured', function () {
      mockConfig.get.mockImplementation(function (key) {
        if (key === 'apiUrl') {
          return '';
        }
        return '';
      });
      new api_client_1.ApiClient(mockConfig);
      expect(axios_1.default.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://localhost:3000/api',
        }),
      );
    });
  });
  describe('getScore', function () {
    it('fetches score for given session ID', function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var mockScore, result;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              mockScore = {
                overallScore: 85.5,
                dimensions: [
                  { name: 'Security', score: 90, questionsAnswered: 10, totalQuestions: 15 },
                ],
              };
              mockAxiosInstance.get.mockResolvedValue({ data: mockScore });
              return [4 /*yield*/, apiClient.getScore('session-123')];
            case 1:
              result = _a.sent();
              expect(mockAxiosInstance.get).toHaveBeenCalledWith('/scoring/session-123');
              expect(result).toEqual(mockScore);
              return [2 /*return*/];
          }
        });
      });
    });
    it('throws error when API call fails', function () {
      return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));
              return [
                4 /*yield*/,
                expect(apiClient.getScore('session-123')).rejects.toThrow('Network error'),
              ];
            case 1:
              _a.sent();
              return [2 /*return*/];
          }
        });
      });
    });
  });
  describe('getHeatmap', function () {
    it('fetches heatmap for given session ID', function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var mockHeatmap, result;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              mockHeatmap = {
                sessionName: 'Test Session',
                overallScore: 75.0,
                dimensions: [
                  {
                    name: 'Requirements',
                    key: 'requirements',
                    score: 80,
                    questionsAnswered: 5,
                    totalQuestions: 10,
                    questions: [{ id: 'q1', text: 'Question 1', severity: 0.7, coverage: 0.5 }],
                  },
                ],
              };
              mockAxiosInstance.get.mockResolvedValue({ data: mockHeatmap });
              return [4 /*yield*/, apiClient.getHeatmap('session-456')];
            case 1:
              result = _a.sent();
              expect(mockAxiosInstance.get).toHaveBeenCalledWith('/heatmap/session-456');
              expect(result).toEqual(mockHeatmap);
              return [2 /*return*/];
          }
        });
      });
    });
  });
  describe('getNextQuestions', function () {
    it('fetches next questions with default options', function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var mockResponse, result;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              mockResponse = {
                questions: [
                  {
                    id: 'q1',
                    text: 'Test question',
                    dimension: 'security',
                    persona: 'CTO',
                    severity: 0.8,
                    priority: 'HIGH',
                  },
                ],
                totalRemaining: 25,
              };
              mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });
              return [4 /*yield*/, apiClient.getNextQuestions('session-789', {})];
            case 1:
              result = _a.sent();
              expect(mockAxiosInstance.get).toHaveBeenCalledWith(
                '/adaptive-logic/next/session-789?',
              );
              expect(result).toEqual(mockResponse);
              return [2 /*return*/];
          }
        });
      });
    });
    it('fetches next questions with count filter', function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var mockResponse;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              mockResponse = { questions: [], totalRemaining: 0 };
              mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });
              return [4 /*yield*/, apiClient.getNextQuestions('session-789', { count: 5 })];
            case 1:
              _a.sent();
              expect(mockAxiosInstance.get).toHaveBeenCalledWith(
                '/adaptive-logic/next/session-789?count=5',
              );
              return [2 /*return*/];
          }
        });
      });
    });
    it('fetches next questions with dimension filter', function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var mockResponse;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              mockResponse = { questions: [], totalRemaining: 0 };
              mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });
              return [
                4 /*yield*/,
                apiClient.getNextQuestions('session-789', { dimension: 'security' }),
              ];
            case 1:
              _a.sent();
              expect(mockAxiosInstance.get).toHaveBeenCalledWith(
                '/adaptive-logic/next/session-789?dimension=security',
              );
              return [2 /*return*/];
          }
        });
      });
    });
    it('fetches next questions with persona filter', function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var mockResponse;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              mockResponse = { questions: [], totalRemaining: 0 };
              mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });
              return [4 /*yield*/, apiClient.getNextQuestions('session-789', { persona: 'CTO' })];
            case 1:
              _a.sent();
              expect(mockAxiosInstance.get).toHaveBeenCalledWith(
                '/adaptive-logic/next/session-789?persona=CTO',
              );
              return [2 /*return*/];
          }
        });
      });
    });
    it('fetches next questions with all filters', function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var mockResponse;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              mockResponse = { questions: [], totalRemaining: 0 };
              mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });
              return [
                4 /*yield*/,
                apiClient.getNextQuestions('session-789', {
                  count: 3,
                  dimension: 'architecture',
                  persona: 'BA',
                }),
              ];
            case 1:
              _a.sent();
              expect(mockAxiosInstance.get).toHaveBeenCalledWith(
                '/adaptive-logic/next/session-789?count=3&dimension=architecture&persona=BA',
              );
              return [2 /*return*/];
          }
        });
      });
    });
  });
  describe('submitAnswer', function () {
    it('submits answer for a question', function () {
      return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              mockAxiosInstance.post.mockResolvedValue({ data: { success: true } });
              return [4 /*yield*/, apiClient.submitAnswer('session-111', 'question-222', 'Yes')];
            case 1:
              _a.sent();
              expect(mockAxiosInstance.post).toHaveBeenCalledWith('/questionnaire/answer', {
                sessionId: 'session-111',
                questionId: 'question-222',
                value: 'Yes',
              });
              return [2 /*return*/];
          }
        });
      });
    });
    it('submits complex answer object', function () {
      return __awaiter(void 0, void 0, void 0, function () {
        var complexAnswer;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              mockAxiosInstance.post.mockResolvedValue({ data: { success: true } });
              complexAnswer = {
                value: ['Option1', 'Option2'],
                evidence: [{ id: 'e1', url: 'http://example.com/file.pdf' }],
              };
              return [
                4 /*yield*/,
                apiClient.submitAnswer('session-111', 'question-222', complexAnswer),
              ];
            case 1:
              _a.sent();
              expect(mockAxiosInstance.post).toHaveBeenCalledWith('/questionnaire/answer', {
                sessionId: 'session-111',
                questionId: 'question-222',
                value: complexAnswer,
              });
              return [2 /*return*/];
          }
        });
      });
    });
    it('handles submission errors', function () {
      return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              mockAxiosInstance.post.mockRejectedValue(new Error('Submission failed'));
              return [
                4 /*yield*/,
                expect(
                  apiClient.submitAnswer('session-111', 'question-222', 'Yes'),
                ).rejects.toThrow('Submission failed'),
              ];
            case 1:
              _a.sent();
              return [2 /*return*/];
          }
        });
      });
    });
  });
});
