<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddFieldsEncuestaPreguntaTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('encuesta_pregunta', function (Blueprint $table) {
			$table->boolean('esTexto')->default(1);
			$table->timestamp('created_at');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('encuesta_pregunta', function (Blueprint $table) {
			$table->dropColumn(['esTexto', 'created_at']);
        });
    }
}
