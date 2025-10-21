/**
 * BalanceChart component - Monthly balance projection line chart
 * Uses Recharts to visualize income, expenses, and running balance
 */

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { calculateBalanceProjection } from '../utils/calculations';
import { MONTHS } from '../utils/constants';
import './BalanceChart.css';

export const BalanceChart = React.memo(
  ({ expenses, monthlyPaymentOrArray, previousBalance }) => {
    // Memoize expensive calculations to prevent re-renders
    const balanceData = React.useMemo(
      () =>
        calculateBalanceProjection(
          expenses,
          monthlyPaymentOrArray,
          previousBalance
        ),
      [expenses, monthlyPaymentOrArray, previousBalance]
    );

    // Format data for Recharts (also memoized)
    const chartData = React.useMemo(
      () =>
        balanceData.map((item, index) => ({
          month: MONTHS[index],
          balance: item.balance,
          income: item.income,
          expenses: item.expenses,
        })),
      [balanceData]
    );

    // Custom tooltip formatter
    const CustomTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
        return (
          <div className="custom-tooltip">
            <p className="tooltip-label">{label}</p>
            {payload.map((entry, index) => (
              <p key={index} style={{ color: entry.color }}>
                {entry.name}: {entry.value.toLocaleString('da-DK')} kr.
              </p>
            ))}
          </div>
        );
      }
      return null;
    };

    return (
      <div className="balance-chart-container">
        <h3 className="chart-title">📈 Balance udvikling over året</h3>
        <p className="chart-description">
          Viser din månedlige balance baseret på indbetalinger og udgifter
        </p>

        <ResponsiveContainer width="100%" height={350}>
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="month"
              stroke="#6b7280"
              style={{ fontSize: '14px', fontWeight: '500' }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '14px' }}
              tickFormatter={value => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line" />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />

            <Line
              type="monotone"
              dataKey="balance"
              stroke="#667eea"
              strokeWidth={3}
              name="Balance"
              dot={{ fill: '#667eea', r: 5 }}
              activeDot={{ r: 7 }}
            />
            <Line
              type="monotone"
              dataKey="income"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Indbetaling"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Udgifter"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="chart-legend-description">
          <div className="legend-item">
            <span
              className="legend-line"
              style={{ background: '#667eea' }}
            ></span>
            <span>Balance: Din samlede saldo hver måned</span>
          </div>
          <div className="legend-item">
            <span
              className="legend-line legend-dashed"
              style={{ borderColor: '#10b981' }}
            ></span>
            <span>
              Indbetaling:{' '}
              {Array.isArray(monthlyPaymentOrArray)
                ? 'Variabel månedlig overførsel til budgetkonto'
                : 'Fast månedlig overførsel til budgetkonto'}
            </span>
          </div>
          <div className="legend-item">
            <span
              className="legend-line legend-dashed"
              style={{ borderColor: '#ef4444' }}
            ></span>
            <span>Udgifter: Samlede månedlige udgifter</span>
          </div>
        </div>
      </div>
    );
  }
);
