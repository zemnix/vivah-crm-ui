import { format, isValid, parse } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// Define DateRange type locally since it's not exported in react-day-picker v9
type DateRange = {
  from: Date | undefined
  to?: Date | undefined
}

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(date ? format(date, "dd/MM/yyyy") : "")

  React.useEffect(() => {
    setInputValue(date ? format(date, "dd/MM/yyyy") : "")
  }, [date])

  const parseInputValue = (value: string) => {
    const trimmedValue = value.trim()

    if (!trimmedValue) {
      return undefined
    }

    const parsedDate = parse(trimmedValue, "dd/MM/yyyy", new Date())
    return isValid(parsedDate) ? parsedDate : null
  }

  const handleInputBlur = () => {
    const parsedDate = parseInputValue(inputValue)

    if (parsedDate === undefined) {
      onDateChange?.(undefined)
      setInputValue("")
      return
    }

    if (parsedDate) {
      onDateChange?.(parsedDate)
      setInputValue(format(parsedDate, "dd/MM/yyyy"))
      return
    }

    setInputValue(date ? format(date, "dd/MM/yyyy") : "")
  }

  const currentYear = new Date().getFullYear()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="border-b p-3">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleInputBlur}
            placeholder="DD/MM/YYYY"
            disabled={disabled}
          />
        </div>
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            onDateChange?.(selectedDate)
            setInputValue(selectedDate ? format(selectedDate, "dd/MM/yyyy") : "")
            if (selectedDate) {
              setOpen(false)
            }
          }}
          captionLayout="dropdown"
          fromYear={1900}
          toYear={currentYear + 50}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

interface DatePickerWithRangeProps {
  date?: DateRange
  onDateChange?: (date: DateRange | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePickerWithRange({
  date,
  onDateChange,
  placeholder = "Pick a date range",
  disabled = false,
  className,
}: DatePickerWithRangeProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
