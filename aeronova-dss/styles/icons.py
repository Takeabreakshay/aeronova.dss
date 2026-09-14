"""Inline SVG icons — small, self-contained, no external requests.

Hand-drawn in the keyline / hugeicons visual family (1.5 stroke, rounded caps
and joins, 24×24 viewbox). Currying the color and size at render time so any
label in the app can drop in an icon without wiring an image tag.
"""


def icon(name: str, size: int = 16, color: str = "currentColor", stroke: float = 1.6) -> str:
    """Return an inline <svg> string for the given icon name."""
    d = _PATHS.get(name)
    if d is None:
        return ""
    return (
        f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" '
        f'stroke="{color}" stroke-width="{stroke}" stroke-linecap="round" '
        f'stroke-linejoin="round" style="vertical-align:-2px; margin-right:6px;">{d}</svg>'
    )


# Minimal path data for the icons we need. Each is one <path> or a small
# combination. Kept tiny so the CSS payload stays lean.
_PATHS = {
    # navigation / tabs
    "deploy":    '<path d="M3 12h4l2-9 4 18 2-9h6"/>',                      # signal / plan pulse
    "risk":      '<path d="M3 20h18M6 20V10M11 20V4M16 20V13M21 20V7"/>',   # bars
    "recover":   '<path d="M4 4l16 16M20 4L4 20"/>',                        # cross
    "analysis":  '<circle cx="12" cy="12" r="8"/><path d="M12 4v8l5 3"/>',  # clock / analysis
    "ask":       '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',  # chat bubble

    # metrics / states
    "trend-up":   '<path d="M3 17l6-6 4 4 8-8M14 7h7v7"/>',
    "trend-down": '<path d="M3 7l6 6 4-4 8 8M14 17h7v-7"/>',
    "shield":     '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',  # reserve
    "route":      '<path d="M4 6h10a4 4 0 0 1 0 8H10a4 4 0 0 0 0 8h10"/>',   # routing curve
    "plane":      '<path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3.5S18 4 16.5 5.5L13 9 4.8 7.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .4 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 2.5 5.2c.3.5.8.6 1.3.4l.5-.3c.4-.2.6-.6.5-1.1z"/>',
    "spark":      '<path d="M5 12l4-4 4 4 6-6"/>',
    "check":      '<path d="M4 12l5 5L20 7"/>',
    "warn":       '<path d="M12 2L2 22h20L12 2z"/><path d="M12 9v6M12 18h.01"/>',
    "cross":      '<circle cx="12" cy="12" r="9"/><path d="M8 8l8 8M16 8l-8 8"/>',
    "sparkle":    '<path d="M12 3v6M12 15v6M3 12h6M15 12h6"/>',  # guardrail dot
    "logo":       '<path d="M12 2L22 20H2z"/>',                   # triangle brand
}
