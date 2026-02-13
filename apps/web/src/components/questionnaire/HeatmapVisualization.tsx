import React, { useState, useMemo } from 'react';

interface HeatmapCell {
  dimensionKey: string;
  dimensionName: string;
  questionId: string;
  questionText: string;
  severity: number;
  coverage: number;
  residualRisk: number;
}

interface HeatmapDimension {
  key: string;
  name: string;
  weight: number;
  residualRisk: number;
  questionCount: number;
  answeredCount: number;
  averageCoverage: number;
  cells: HeatmapCell[];
}

interface HeatmapVisualizationProps {
  dimensions: HeatmapDimension[];
  onCellClick?: (cell: HeatmapCell) => void;
  onDimensionClick?: (dimension: HeatmapDimension) => void;
  showLabels?: boolean;
  showTooltips?: boolean;
}

/**
 * Get color class based on residual risk value
 * Lower risk = greener, higher risk = redder
 */
const getRiskColorClass = (residualRisk: number): string => {
  if (residualRisk <= 0.2) {
    return 'bg-green-500';
  }
  if (residualRisk <= 0.4) {
    return 'bg-green-300';
  }
  if (residualRisk <= 0.5) {
    return 'bg-yellow-400';
  }
  if (residualRisk <= 0.6) {
    return 'bg-orange-400';
  }
  if (residualRisk <= 0.8) {
    return 'bg-red-400';
  }
  return 'bg-red-600';
};

/**
 * Get text color for contrast
 */
const getTextColorClass = (residualRisk: number): string => {
  return residualRisk > 0.5 ? 'text-white' : 'text-gray-800';
};

/**
 * HeatmapVisualization - Displays gap analysis as a heatmap with drill-down
 */
export const HeatmapVisualization: React.FC<HeatmapVisualizationProps> = ({
  dimensions,
  onCellClick,
  onDimensionClick,
  showLabels = true,
  showTooltips = true,
}) => {
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);

  // Calculate overall score
  const overallScore = useMemo(() => {
    const portfolioResidual = dimensions.reduce(
      (sum, dim) => sum + dim.weight * dim.residualRisk,
      0,
    );
    return Math.round((1 - portfolioResidual) * 100 * 100) / 100;
  }, [dimensions]);

  // Get selected dimension details
  const selectedDimensionData = useMemo(() => {
    return dimensions.find((d) => d.key === selectedDimension);
  }, [dimensions, selectedDimension]);

  const handleDimensionClick = (dim: HeatmapDimension) => {
    setSelectedDimension(dim.key === selectedDimension ? null : dim.key);
    onDimensionClick?.(dim);
  };

  return (
    <div className="heatmap-visualization">
      {/* Header with overall score */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Gap Analysis Heatmap</h3>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-500">Readiness Score</p>
            <p
              className={`text-2xl font-bold ${overallScore >= 80 ? 'text-green-600' : overallScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}
            >
              {overallScore}%
            </p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        <span className="text-gray-600">Risk Level:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-500 rounded" />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-yellow-400 rounded" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-600 rounded" />
          <span>High</span>
        </div>
      </div>

      {/* Dimension overview grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
        {dimensions.map((dim) => (
          <button
            key={dim.key}
            onClick={() => handleDimensionClick(dim)}
            className={`p-4 rounded-lg text-left transition-all
                            ${getRiskColorClass(dim.residualRisk)}
                            ${selectedDimension === dim.key ? 'ring-4 ring-blue-500 ring-offset-2' : 'hover:scale-105'}
                        `}
          >
            <div className={`font-medium ${getTextColorClass(dim.residualRisk)}`}>
              {showLabels ? dim.name : dim.key}
            </div>
            <div className={`text-sm ${getTextColorClass(dim.residualRisk)} opacity-80`}>
              {dim.answeredCount}/{dim.questionCount} answered
            </div>
            <div className={`text-lg font-bold mt-1 ${getTextColorClass(dim.residualRisk)}`}>
              {Math.round((1 - dim.residualRisk) * 100)}%
            </div>
          </button>
        ))}
      </div>

      {/* Selected dimension drill-down */}
      {selectedDimensionData && (
        <div className="bg-white rounded-lg border p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">{selectedDimensionData.name}</h4>
              <p className="text-sm text-gray-500">
                Weight: {(selectedDimensionData.weight * 100).toFixed(1)}% | Average Coverage:{' '}
                {(selectedDimensionData.averageCoverage * 100).toFixed(0)}%
              </p>
            </div>
            <button
              onClick={() => setSelectedDimension(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Questions heatmap */}
          <div className="space-y-2">
            {selectedDimensionData.cells.map((cell) => (
              <div
                key={cell.questionId}
                className="relative group"
                onMouseEnter={() => setHoveredCell(cell)}
                onMouseLeave={() => setHoveredCell(null)}
              >
                <button
                  onClick={() => onCellClick?.(cell)}
                  className={`w-full p-3 rounded-lg text-left transition-all flex items-center justify-between
                                        ${getRiskColorClass(cell.residualRisk)} hover:opacity-90`}
                >
                  <div className={`flex-1 ${getTextColorClass(cell.residualRisk)}`}>
                    <span className="font-medium line-clamp-1">{cell.questionText}</span>
                  </div>
                  <div
                    className={`flex items-center gap-4 ${getTextColorClass(cell.residualRisk)}`}
                  >
                    <span className="text-sm opacity-80">
                      Severity: {(cell.severity * 100).toFixed(0)}%
                    </span>
                    <span className="text-sm opacity-80">
                      Coverage: {(cell.coverage * 100).toFixed(0)}%
                    </span>
                    <span className="font-bold">{Math.round((1 - cell.residualRisk) * 100)}%</span>
                  </div>
                </button>

                {/* Tooltip */}
                {showTooltips && hoveredCell?.questionId === cell.questionId && (
                  <div className="absolute left-0 bottom-full mb-2 z-10 w-80 p-3 bg-gray-900 text-white rounded-lg shadow-lg text-sm">
                    <p className="font-medium mb-2">{cell.questionText}</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="opacity-70">Severity</span>
                        <p className="font-bold">{(cell.severity * 100).toFixed(0)}%</p>
                      </div>
                      <div>
                        <span className="opacity-70">Coverage</span>
                        <p className="font-bold">{(cell.coverage * 100).toFixed(0)}%</p>
                      </div>
                      <div>
                        <span className="opacity-70">Residual Risk</span>
                        <p className="font-bold">{(cell.residualRisk * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-700 text-xs opacity-70">
                      Click to view details and add evidence
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary statistics */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Total Questions</p>
          <p className="text-2xl font-bold text-gray-900">
            {dimensions.reduce((sum, d) => sum + d.questionCount, 0)}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Answered</p>
          <p className="text-2xl font-bold text-green-600">
            {dimensions.reduce((sum, d) => sum + d.answeredCount, 0)}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Dimensions</p>
          <p className="text-2xl font-bold text-blue-600">{dimensions.length}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">At Risk</p>
          <p className="text-2xl font-bold text-red-600">
            {dimensions.filter((d) => d.residualRisk > 0.5).length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default HeatmapVisualization;
