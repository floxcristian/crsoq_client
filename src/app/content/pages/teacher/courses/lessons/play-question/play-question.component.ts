// + Se podrían poner más emiters por si el profesor tuviera 2 sesiones iniciadas al mismo tiempo y desea ver los cambios

// Angular
import { Component, OnInit, Input, ViewChild, OnDestroy } from '@angular/core';
// rxjs
import { Subscription } from 'rxjs';
// ng-bootstrap
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
// ngx-toastr
import { ToastrService } from 'ngx-toastr';
// ngx-sweetalert2
import { SwalComponent } from '@toverux/ngx-sweetalert2';
// Constants
import { SWAL_SUCCESS_DELETE_PARTICIPATION, SWAL_DELETE_PARTICIPATION } from 'src/app/config/swal_config';
// Services
import { LessonQuestionService } from 'src/app/core/services/API/lesson-question.service';

@Component({
   selector: 'cw-play-question',
   templateUrl: './play-question.component.html',
   styleUrls: ['./play-question.component.scss']
})
export class PlayQuestionComponent implements OnInit, OnDestroy {

   @Input() question;
   @Input() id_lesson;

   // Hace referencia al template 'successSwal'
   @ViewChild('successSwal') private successSwal: SwalComponent;

   SWAL_DELETE_PARTICIPATION = SWAL_DELETE_PARTICIPATION;
   SWAL_SUCCESS_DELETE_PARTICIPATION = SWAL_SUCCESS_DELETE_PARTICIPATION;

   subscriptions$: Subscription;
   data_participants: Array<any> = [];
   participants_filtered: Array<any> = [];

   participation_status;

   update; // Indica si se actualizo el estado de la clase??

   student_selected = null; // Actual estudiante seleccionado para responder
   current_question_status: number; // Estado de la pregunta actual
   counter_ended_question: number = 7; // Contador de finalización de pregunta

   constructor(
      public activeModal: NgbActiveModal,
      private toastr: ToastrService,
      private _classQuestionSrv: LessonQuestionService,
   ) { }

   ngOnInit() {
      this.subscriptions$ = new Subscription();
      this.current_question_status = this.question.status; // Establece la pregunta actual

      this.enterToPlayQuestionSectionRoomAsTeacher(); // Emiter: indica que el profesor ingresó a la sala

      // Listener: recibe múltiples eventos
      // + type:
      //   [1] actualiza la lista completa de estudiantes participantes
      //       { type: 1, detail: UPDATE_STUDENT_PARTICIPANTS, participantes: [ ... ] }
      //   [2] indica cuando un estudiante decide participar
      //       { type: 2, detail: NEW_STUDENT_PARTICIPANT, student: { id_user, ... } }
      //   [3] indica cuando el profesor cancela la selección del estudiante para responder
      //       { type: 3, detail: CANCEL_STUDENT_SELECTED, id_user, question_status }
      //   [4] indica cuando un estudiante cancela su participación
      //       { type: 4, detail: CANCEL_STUDENT_PARTICIPATION, id_user }
      this.subscriptions$.add(this._classQuestionSrv.listenAStudentHasEnteredToParticipate()
         .subscribe((data: any) => {

            const { type } = data;

            console.log("data event: ", data);

            // { type: 'selected', user: {...} }

            // Como marcar al estudiante seleccionado...
            // { participant_selected: 3, data_participants: [] }
            // if(Array.isArray(data)){
            //    this.data_participants = data;
            // }

            if (type == 1) {
               this.data_participants = data.participants;
               this.filterStudentsByStatus(2); // Filtrar solo estudiantes en estado 'no seleccionado'
               // Busca al estudiante seleccionado entre los participantes (si es que hay)
               let index_selected = this.data_participants.findIndex(participant => participant.status == 3);
               // Establece el estudiante seleccionado (si lo encuentra)
               if (index_selected >= 0) this.student_selected = this.data_participants[index_selected];

            }
            else if (type == 2) {

               const { student } = data;
               // Busca al nuevo participante entre los participantes actuales
               let student_exist = this.data_participants.findIndex(participant => participant.id_user == student.id_user);
               // Lo agrega a la lista de participantes (si no lo encuentra)
               if (student_exist < 0) this.data_participants.push(student);
               this.filterStudentsByStatus(2); // Filtrar solo estudiantes en estado 'no seleccionado'

            }
            else if (type == 3) {

               if (this.student_selected && (this.student_selected.id_user == data.id_user)) {
                  this.student_selected = null; // Cancela al estudiante seleccionado
                  this.question.status = data.question_status;
               }

            }
            else if (type == 4) {

               // Busca al estudiante que canceló su participación entre los participantes
               let index_student = this.data_participants.findIndex(participant => participant.id_user == data.id_user);
               // Elimina al estudiantes de la lista de participantes (si lo encuentra)
               if (index_student >= 0) this.data_participants.splice(index_student, 1);
               this.filterStudentsByStatus(2); // Filtrar solo estudiantes en estado 'no seleccionado'

               // Cancela al estudiante seleccionado si es el mismo que canceló su participación
               //if (this.student_selected && (id_user == this.student_selected.id_user)) this.student_selected = null;

            }

            // else if (data.student_selected) {
            //    this.student_selected = data.student_selected;
            // }

            //this.toastr.info(`Ha sido iniciada una pregunta para la asignatura ${data.subject}.`, 'Pregunta Iniciada!');
         })
      );

   }

   // Actualiza el estado de la pregunta actual
   updateClassQuestionStatus(status: number) {

      this._classQuestionSrv.updateLessonQuestion(this.id_lesson, this.question.id_question, status)
         .subscribe(
            (result: any) => {
               if (!result) {
                  this.toastr.error('Asegúrate de no tener otra pregunta iniciada.', 'Ha ocurrido un error!');
               }
               else {
                  this.question.status = status;
                  
                  if(status == 1) { // Si la pregunta se reinicia (status 'no iniciada')
                     this.data_participants = [];
                     this.participants_filtered = [];
                  }
                  
                  this.toastr.success('El estado de la clase ha sido actualizado correctamente.', 'Acción realizada!');
               }
            },
            (error) => {
               console.log("error:", error);
            });
   }



   // Emiter: indica que el profesor ingresó a la sala
   enterToPlayQuestionSectionRoomAsTeacher() {
      this._classQuestionSrv.enterToPlayQuestionSectionRoomAsTeacher({ id_class: this.id_lesson });
   }

   // Emiter: indica que el profesor salió de la sala
   exitToPlayQuestionSectionRoomAsTeacher() {
      this._classQuestionSrv.exitToPlayQuestionSectionRoomAsTeacher({ id_class: this.id_lesson });
   }

   // Emiter: selecciona un estudiante para responder
   selectStudentToAnswer(user) {
      this._classQuestionSrv.selectStudentToParticipate({
         id_user: user.id_user,
         id_class: this.id_lesson,
         id_question: this.question.id_question
      });
      this.question.status = 4; // Actualiza el estado de la pregunta a 'respondiendo'
      user.status = 3; // Cambia el estado del estudiante de forma local a 'seleccionado'
      this.student_selected = user; // Indica estudiante que fue seleccionado para responder
   }

   // Emiter: cancela a estudiante seleccionado para responder
   cancelStudentSelected() {
      this._classQuestionSrv.cancelSelectedStudent({
         id_user: this.student_selected.id_user,
         id_class: this.id_lesson,
         id_question: this.question.id_question
      });
      this.question.status = 3; // Actualiza el estado de la pregunta a 'detenida'
      const student = this.data_participants.find(student => student.id_user == this.student_selected.id_user);
      student.status = 2;
      this.student_selected = null; // Quita al estudiante seleccionado
      this.filterStudentsByStatus(2); // Filtrar solo estudiantes en estado 'no seleccionado'
   }


   // Emiter: indica que un estudiante respondió correctamente
   successAnswer() {

      // Busca al estudiante ganador entre los participantes
      let index_student = this.data_participants.findIndex(participant => participant.id_user == this.student_selected.id_user);
      // Establece al estudiante ganador (si lo encuentra)
      if (index_student >= 0) this.data_participants[index_student].status = 5;
      //this.filterStudentsByStatus(2); // Filtrar solo estudiantes en estado 'no seleccionado'


      // ENVÍO ARRAY DE PARTICIPANTES: [ {id_user, winner, participant:}]
      this._classQuestionSrv.setStudentParticipationStatus(this.student_selected, this.id_lesson, this.question.id_question)
         .subscribe(
            (result: any) => {


               // HACER ALGO PARA PONER EL ESTADO EN GANADOR
               console.log("RESULT: ", result);
               let counter = setInterval(() => {
                  this.counter_ended_question--;
                  if (this.counter_ended_question == 0) {
                     clearInterval(counter);

                     
                     this.updateClassQuestionStatus(5); // Actualiza el estado de la pregunta
                     this.data_participants = null;
                     this.participants_filtered = null; 
                     this.student_selected = null;
                     this.activeModal.close(); // Cierra el modal
                  }
               }, 1000);
               //this.counter_ended_question
            },
            (error) => {
               console.log("error:", error);
            });
   }

   incorrectAnswer() {

      // Busca al partipante 'perdedor' entre los participantes
      let index_student = this.data_participants.findIndex(participant => participant.id_user == this.student_selected.id_user);
      // Indica que el participante seleccionado perdió (si lo encuentra)
      if (index_student >= 0) this.data_participants[index_student].status = 4;
      this.filterStudentsByStatus(2); // Filtrar solo estudiantes en estado 'no seleccionado'

      this.question.status = 3; // Actualiza el estado de la pregunta a 'detenida'
      //this.student_selected.status_winner = false;


      this._classQuestionSrv.setLoserStudent(this.student_selected, this.id_lesson, this.question.id_question)
         .subscribe(
            (result: any) => {
               // Actualiza el estado del estudiante perdedor (localmente)

               console.log("RESULT: ", result);

            },
            error => {
               console.log("error:", error);
            });

      this.student_selected = null;


   }

   // Filtra los participantes en base a su estado
   filterStudentsByStatus(status: number) {
      this.participants_filtered = this.data_participants.filter(participant => participant.status == status);
   }

   ngOnDestroy() {
      this.exitToPlayQuestionSectionRoomAsTeacher(); // Emiter: indica que el profesor salió de la sala
      this.subscriptions$.unsubscribe(); // Cancela todas las subcripciones
   }

}