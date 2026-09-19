# PetroARX demo video

The walkthrough player on `/petrophysics_gui.html` looks for a single file:

    assets/video/petroarx-demo.mp4

Drop the recording in at that exact path and the player picks it up with no code
change. Until the file exists, the player falls back to a short "coming soon"
note that points visitors at the interface gallery instead.

## Recommended encode

    H.264 (yuv420p) + AAC, MP4 container
    1920x1080 or 1280x720, 30 fps
    target under ~25 MB so the page stays fast

The poster frame is the PetroARX dashboard screenshot, set in the markup — no
separate poster file is needed.
