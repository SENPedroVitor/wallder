package com.waddle.app.activities;

import android.os.Bundle;
import android.widget.ImageButton;
import android.widget.Switch;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import com.waddle.app.R;

public class RoutineActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_routine);

        String routineName = getIntent().getStringExtra("routine_name");
        String routineInstruction = getIntent().getStringExtra("routine_instruction");
        String routineSchedule = getIntent().getStringExtra("routine_schedule");

        TextView tvName = findViewById(R.id.tv_routine_name);
        TextView tvInstruction = findViewById(R.id.tv_routine_instruction);
        TextView tvSchedule = findViewById(R.id.tv_routine_schedule);
        Switch switchActive = findViewById(R.id.switch_active);

        if (tvName != null && routineName != null) tvName.setText(routineName);
        if (tvInstruction != null && routineInstruction != null) tvInstruction.setText(routineInstruction);
        if (tvSchedule != null && routineSchedule != null) tvSchedule.setText(routineSchedule);
        if (switchActive != null) switchActive.setChecked(true);

        ImageButton btnBack = findViewById(R.id.btn_back);
        if (btnBack != null) {
            btnBack.setOnClickListener(v -> finish());
        }
    }
}
