import {
  Button,
  Input,
  Listbox,
  ListboxItem,
  ScrollShadow,
  Spinner,
} from "@nextui-org/react";
import React from "react";
import {
  AriaComboBoxProps,
  Overlay,
  useComboBox,
  useFilter,
  usePopover,
} from "react-aria";
import { useComboBoxState } from "react-stately";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

interface ComboBoxProps<T extends object> extends AriaComboBoxProps<T> {
  isLoading?: boolean;
  onLoadMore?: () => void;
}

export function ComboBox<T extends object>(props: ComboBoxProps<T>) {
  let { contains } = useFilter({ sensitivity: "base" });
  let state = useComboBoxState({ ...props, defaultFilter: contains });

  let buttonRef = React.useRef(null);
  let inputRef = React.useRef<HTMLInputElement>(null);
  let listBoxRef = React.useRef(null);
  let popoverRef = React.useRef(null);

  let {
    buttonProps,
    inputProps: {
      onFocus,
      onBlur,
      size,
      value,
      defaultValue,
      color,
      disabled,
      ...inputProps
    },
    listBoxProps: { autoFocus, ...listBoxProps },
  } = useComboBox(
    {
      ...props,
      inputRef,
      buttonRef,
      listBoxRef,
      popoverRef,
    },
    state
  );

  let { popoverProps } = usePopover(
    {
      ...props,
      popoverRef,
      triggerRef: inputRef,
      placement: "bottom",
    },
    state
  );

  return (
    <div>
      <Input
        {...inputProps}
        ref={inputRef}
        value={typeof value === "string" ? value : value?.toString()}
        label={props.label}
        onFocus={onFocus as any}
        defaultValue={
          typeof defaultValue === "string"
            ? defaultValue
            : defaultValue?.toString()
        }
        isDisabled={disabled}
        onBlur={onBlur as any}
        endContent={
          <Button {...buttonProps} ref={buttonRef} isIconOnly size="sm">
            {state.isOpen ? (
              <FiChevronUp size={16} />
            ) : (
              <FiChevronDown size={16} />
            )}
          </Button>
        }
      />
      {state.isOpen && (
        <Overlay>
          <div className="relative">
            <div
              {...popoverProps}
              ref={popoverRef}
              className="shadow-md rounded-lg relative translate-x-[18px]"
              style={{
                width: (inputRef.current?.clientWidth ?? 0) + 60,
              }}
            >
              <ScrollShadow className="w-full h-64">
                <Listbox
                  {...listBoxProps}
                  ref={listBoxRef}
                  state={state}
                  items={props.items}
                >
                  {props.children}
                </Listbox>
              </ScrollShadow>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}
