Assuming your FF9 installation path is `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX`, create a `.env` file next to this readme and set the `FF9_MAIN_DATA` variable to the path to the `mainData` resource file of your FF9 installation, e.g.

```shell
FF9_MAIN_DATA='D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\x64\FF9_Data\mainData'
```

Just adjust the path to your local installation path in this and the following examples.

Use [ILSpy](https://github.com/icsharpcode/ILSpy) to decompile `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\x64\FF9_Data\Managed\Assembly-CSharp.dll` (unpatched) as `*.csproj` into `./source/pc/Assembly-CSharp` (relative to this readme). Make sure to have .NET 4.0 installed for ILSpy to resolve symbols correctly.

Patch the game with [Memoria](https://github.com/Albeoris/Memoria) or [Moguri Mod](https://sites.google.com/view/moguri-mod/home) and copy the following icons into `display/public/final-fantasy-9/icon` (relative to the repository root):

- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\ability_stone.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\ability_stone_null.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\ap_bar_complete_star.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\ap_bar_full.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\ap_bar_half.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\arrow_down.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\arrow_up.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\cursor_hand_choice.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\help_mog_dialog.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\icon_action.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\icon_back.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\icon_status_00.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\icon_status_01.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\icon_status_02.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\icon_status_03.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\icon_status_04.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\icon_status_04_es.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\icon_status_05.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\icon_status_06.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\icon_status_07.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\icon_status_08.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\icon_status_09.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\icon_status_10.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\icon_status_11.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\icon_status_12.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\icon_status_13.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\icon_status_14.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\icon_status_15.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\icon_status_16.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\icon_status_17.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\icon_status_18.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\icon_status_19.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\icon_status_20.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\icon_status_21.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\icon_status_22.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\icon_status_23.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\item01_00.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\item02_00.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\item15_01.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\item18_00.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\item23_07.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\item26_09.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\joystick_button_a.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\joystick_button_b.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\joystick_button_x.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\joystick_button_y.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\joystick_l1.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\joystick_l2.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\joystick_r1.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\joystick_r2.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\joystick_select.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\joystick_start.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\keyboard_button.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\keyboard_button_arrow_down.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\keyboard_button_arrow_left.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\keyboard_button_arrow_right.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\keyboard_button_arrow_up.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\keyboard_button_backspace.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\keyboard_button_backspace_fr_gr_it.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\keyboard_button_enter.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\keyboard_button_enter_fr_gr.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\keyboard_button_enter_it.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\keyboard_button_esc.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\ps_dpad.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\ps_dpad_down.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\ps_dpad_left.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\ps_dpad_right.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\ps_dpad_up.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\skill_stone_gem.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\skill_stone_null.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\skill_stone_on.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\text_lv_es.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\text_lv_fr.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\Icon Atlas\text_lv_us_uk_jp_gr_it.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\TutorialUI Atlas\tutorial_quadmist_2.png`
- `D:\SteamLibrary\steamapps\common\FINAL FANTASY IX\StreamingAssets\UI\Atlas\TutorialUI Atlas\tutorial_quadmist_3.png`
