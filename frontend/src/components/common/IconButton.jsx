import { Button, Tooltip } from "@heroui/react";

// Icon-only button with an accessible label shown as a tooltip.
export default function IconButton({
  label,
  icon: Icon,
  onPress,
  active = false,
  placement = "bottom",
  size = "sm",
  variant = "ghost",
  className = "",
  iconSize = 18,
  isDisabled,
}) {
  return (
    <Tooltip delay={400} closeDelay={0}>
      <Button
        isIconOnly
        size={size}
        variant={variant}
        aria-label={label}
        onPress={onPress}
        isDisabled={isDisabled}
        className={`${active ? "bg-default text-accent" : "text-muted hover:text-foreground"} ${className}`}
      >
        <Icon size={iconSize} strokeWidth={2} />
      </Button>
      <Tooltip.Content placement={placement}>{label}</Tooltip.Content>
    </Tooltip>
  );
}
