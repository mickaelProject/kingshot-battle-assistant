"use client";

import {
  formatUtcDatetimeInputValue,
  mergeUtcDateAndTime,
  splitUtcDatetimeInput,
} from "@/lib/utc-legion-start-input";

type Props = {
  id: string;
  groupLabel: string;
  dateLabel: string;
  timeLabel: string;
  value: string;
  onChange: (next: string) => void;
};

export function UtcLegionDatetimeField({
  id,
  groupLabel,
  dateLabel,
  timeLabel,
  value,
  onChange,
}: Props) {
  const { date, time } = splitUtcDatetimeInput(value);

  function onDateChange(nextDate: string) {
    const { time: prevTime } = splitUtcDatetimeInput(value);
    const timePart = prevTime || "00:00";
    if (!nextDate) {
      onChange("");
      return;
    }
    const merged = mergeUtcDateAndTime(nextDate, timePart);
    if (merged) onChange(merged);
  }

  function onTimeChange(nextTime: string) {
    const { date: prevDate } = splitUtcDatetimeInput(value);
    const datePart =
      prevDate || formatUtcDatetimeInputValue(new Date()).slice(0, 10);
    if (!nextTime) return;
    const merged = mergeUtcDateAndTime(datePart, nextTime);
    if (merged) onChange(merged);
  }

  return (
    <fieldset className="utc-legion-field">
      <legend className="utc-legion-field__legend">{groupLabel}</legend>
      <div className="utc-legion-field__row">
        <div className="utc-legion-field__cell">
          <label className="utc-legion-field__sub" htmlFor={`${id}-date`}>
            {dateLabel}
          </label>
          <input
            id={`${id}-date`}
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="utc-legion-field__input"
          />
        </div>
        <div className="utc-legion-field__cell">
          <label className="utc-legion-field__sub" htmlFor={`${id}-time`}>
            {timeLabel}
          </label>
          <input
            id={`${id}-time`}
            type="time"
            step={60}
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
            className="utc-legion-field__input"
          />
        </div>
      </div>
    </fieldset>
  );
}
